/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  RELATIONSHIP_KI_TYPE,
  RELATIONSHIP_RELATION_ATTRIBUTE,
} from '../../common/dreaming';
import type {
  ReferenceEntity,
  ReferenceFact,
  ReferenceMemories,
  ReferenceRelationship,
} from './reference';
import type { DumpedKi } from './types';

export const KINDS = ['entity', 'fact', 'relationship'] as const;
export type Kind = (typeof KINDS)[number];

export interface CompareOptions {
  /** Least score for a fact to match a reference fact. */
  factThreshold: number;
  /** Least score for an entity to match a reference entity. */
  entityThreshold: number;
}

/** Score kept for a match across types of the same kind: a match of the right type wins. */
const OTHER_TYPE_FACTOR = 0.9;
/** Share of a fact's score from its keywords, when the reference gives some. */
const KEYWORD_WEIGHT = 0.6;
/** Score of a name whose words all appear in the other name. */
const CONTAINED_NAME_SCORE = 0.8;

const STOP_WORDS = new Set(
  (
    'a an and are as at be been but by for from had has have he her his i in into is it its ' +
    'me my of on or our she so than that the their them then there they this to was we were ' +
    'what when where which who will with you your user users'
  ).split(' ')
);

/** Lowercase words without accents and stop words, with a plural s dropped. */
export const wordsOf = (text: string): string[] =>
  (
    text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
    .filter((word) => !STOP_WORDS.has(word))
    .map((word) =>
      word.length > 3 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word
    );

const wordSet = (...texts: Array<string | undefined>): Set<string> =>
  new Set(texts.flatMap((text) => (text ? wordsOf(text) : [])));

/** Share of `words` in `within`. */
const coverage = (words: Set<string>, within: Set<string>): number =>
  words.size === 0 ? 0 : [...words].filter((word) => within.has(word)).length / words.size;

/** Whether every word of a keyword is in the text, so punctuation and case do not matter. */
export const hasKeyword = (keyword: string, words: Set<string>): boolean => {
  const keywordWords = wordsOf(keyword);
  return keywordWords.length > 0 && keywordWords.every((word) => words.has(word));
};

/** How alike two names are: 1 when equal, high when one's words are all in the other. */
export const nameScore = (a: string, b: string): number => {
  const aWords = wordSet(a);
  const bWords = wordSet(b);
  if (aWords.size === 0 || bWords.size === 0) {
    return 0;
  }
  const shared = [...aWords].filter((word) => bWords.has(word)).length;
  if (shared === aWords.size && shared === bWords.size) {
    return 1;
  }
  const jaccard = shared / (aWords.size + bWords.size - shared);
  return shared === Math.min(aWords.size, bWords.size)
    ? Math.max(jaccard, CONTAINED_NAME_SCORE)
    : jaccard;
};

const kiWords = ({ title, description, content }: DumpedKi): Set<string> =>
  wordSet(title, description, content);

/** How well a KI holds a reference fact: its keywords, and how much of its wording it covers. */
export const factScore = (reference: ReferenceFact, ki: DumpedKi): number => {
  const words = kiWords(ki);
  const covered = coverage(wordSet(reference.title, reference.content), words);
  if (reference.keywords.length === 0) {
    return covered;
  }
  const keywords =
    reference.keywords.filter((keyword) => hasKeyword(keyword, words)).length /
    reference.keywords.length;
  return KEYWORD_WEIGHT * keywords + (1 - KEYWORD_WEIGHT) * covered;
};

/** How well a KI is a reference entity: the best match of its name with the entity's names. */
export const entityScore = (reference: ReferenceEntity, ki: DumpedKi): number =>
  Math.max(
    ...[reference.title, ...reference.aliases].map((name) => nameScore(name, ki.title ?? ''))
  );

const typeOf = (ki: DumpedKi): { kind: Kind; type: string } | undefined => {
  if (ki.type.startsWith(FACT_TYPE_PREFIX)) {
    return { kind: 'fact', type: ki.type.slice(FACT_TYPE_PREFIX.length) };
  }
  if (ki.type.startsWith(ENTITY_TYPE_PREFIX)) {
    return { kind: 'entity', type: ki.type.slice(ENTITY_TYPE_PREFIX.length) };
  }
  if (ki.type === RELATIONSHIP_KI_TYPE) {
    const relation = ki.attributes?.[RELATIONSHIP_RELATION_ATTRIBUTE];
    return { kind: 'relationship', type: typeof relation === 'string' ? relation : 'unknown' };
  }
  return undefined;
};

/** The ends of a relationship KI, from its `ki://` references. */
export const endsOf = (ki: DumpedKi): { from?: string; to?: string } => {
  const end = (side: 'from' | 'to') =>
    ki.references
      ?.find(({ uri, description }) => uri.startsWith('ki://') && description === side)
      ?.uri.slice('ki://'.length);
  return { from: end('from'), to: end('to') };
};

interface Candidate {
  referenceId: string;
  kiId: string;
  score: number;
  sameType: boolean;
}

/** Pairs each reference with at most one KI and each KI with at most one reference, best first. */
const assign = (candidates: Candidate[]): Candidate[] => {
  const taken = { references: new Set<string>(), kis: new Set<string>() };
  return [...candidates]
    .sort((a, b) => b.score - a.score)
    .filter(({ referenceId, kiId }) => {
      if (taken.references.has(referenceId) || taken.kis.has(kiId)) {
        return false;
      }
      taken.references.add(referenceId);
      taken.kis.add(kiId);
      return true;
    });
};

const scoredPairs = <R extends { id: string; type: string }>(
  references: R[],
  kis: Array<{ ki: DumpedKi; type: string }>,
  score: (reference: R, ki: DumpedKi) => number,
  threshold: number
): Candidate[] =>
  references.flatMap((reference) =>
    kis.flatMap(({ ki, type }) => {
      const sameType = type === reference.type;
      const value = score(reference, ki) * (sameType ? 1 : OTHER_TYPE_FACTOR);
      return value >= threshold
        ? [{ referenceId: reference.id, kiId: ki.id, score: value, sameType }]
        : [];
    })
  );

export interface MemoryMatch {
  kind: Kind;
  type: string;
  referenceId: string;
  reference: string;
  optional: boolean;
  /** The KI that matched, unless none did. */
  kiId?: string;
  ki?: string;
  score?: number;
  /** False when the KI is of another type of the same kind. */
  sameType?: boolean;
}

export interface Tally {
  /** Reference memories, and how many of them are required. */
  expected: number;
  required: number;
  /** KIs the pipeline wrote. */
  produced: number;
  /** Reference memories a KI matched, of them required, and of them by a KI of the same type. */
  matched: number;
  matchedRequired: number;
  sameType: number;
}

export interface Comparison {
  sample?: string;
  matches: MemoryMatch[];
  /** KIs that matched no reference memory. */
  extras: Array<{ kind: Kind; type: string; kiId: string; ki: string }>;
  byKind: Record<string, Tally>;
  byType: Record<string, Tally>;
}

const emptyTally = (): Tally => ({
  expected: 0,
  required: 0,
  produced: 0,
  matched: 0,
  matchedRequired: 0,
  sameType: 0,
});

const label = (kind: Kind, type: string): string => `${kind}.${type}`;

const referenceText = (memory: ReferenceEntity | ReferenceFact): string =>
  'content' in memory && memory.content ? `${memory.title}: ${memory.content}` : memory.title;

const kiLabel = ({ title, content }: DumpedKi): string =>
  [title, content].filter(Boolean).join(': ').replace(/\s+/g, ' ').slice(0, 200);

const relationshipText = (
  { from, type, to }: ReferenceRelationship,
  titles: Map<string, string>
): string => `${titles.get(from) ?? from} ${type} ${titles.get(to) ?? to}`;

/** Matches the KIs of a run, or of one sample, to the reference memories, by code alone. */
export const compareMemories = (
  reference: ReferenceMemories,
  kis: DumpedKi[],
  { factThreshold, entityThreshold }: CompareOptions,
  sample?: string
): Comparison => {
  const typed = kis.flatMap((ki) => {
    const kiType = typeOf(ki);
    return kiType ? [{ ki, ...kiType }] : [];
  });
  const ofKind = (kind: Kind) => typed.filter((item) => item.kind === kind);
  const kiById = new Map(kis.map((ki) => [ki.id, ki]));

  const entityMatches = assign(
    scoredPairs(reference.entities, ofKind('entity'), entityScore, entityThreshold)
  );
  const factMatches = assign(
    scoredPairs(reference.facts, ofKind('fact'), factScore, factThreshold)
  );
  const kiOfReference = new Map(
    [...entityMatches, ...factMatches].map(({ referenceId, kiId }) => [referenceId, kiId])
  );

  const relationshipKis = ofKind('relationship').map(({ ki, type }) => ({
    ki,
    type,
    ...endsOf(ki),
  }));
  const relationshipIds = reference.relationships.map(
    (relationship, index) => relationship.id ?? `r${index + 1}`
  );
  const relationshipMatches = assign(
    reference.relationships.flatMap((relationship, index) => {
      const from = kiOfReference.get(relationship.from);
      const to = kiOfReference.get(relationship.to);
      if (!from || !to) {
        return [];
      }
      return relationshipKis
        .filter(
          (ki) =>
            ki.type === relationship.type &&
            ((ki.from === from && ki.to === to) || (ki.from === to && ki.to === from))
        )
        .map(({ ki }) => ({
          referenceId: relationshipIds[index],
          kiId: ki.id,
          score: 1,
          sameType: true,
        }));
    })
  );

  const matchOf: Record<Kind, Map<string, Candidate>> = {
    entity: new Map(entityMatches.map((match) => [match.referenceId, match])),
    fact: new Map(factMatches.map((match) => [match.referenceId, match])),
    relationship: new Map(relationshipMatches.map((match) => [match.referenceId, match])),
  };
  const titles = new Map(
    [...reference.entities, ...reference.facts].map(({ id, title }) => [id, title])
  );
  const withKi = (kind: Kind, referenceId: string) => {
    const match = matchOf[kind].get(referenceId);
    const ki = match && kiById.get(match.kiId);
    return match && ki
      ? {
          kiId: ki.id,
          ki: kiLabel(ki),
          score: Math.round(match.score * 100) / 100,
          sameType: match.sameType,
        }
      : {};
  };
  const matches: MemoryMatch[] = [
    ...reference.entities.map((entity) => ({
      kind: 'entity' as const,
      type: entity.type,
      referenceId: entity.id,
      reference: referenceText(entity),
      optional: entity.optional,
      ...withKi('entity', entity.id),
    })),
    ...reference.facts.map((fact) => ({
      kind: 'fact' as const,
      type: fact.type,
      referenceId: fact.id,
      reference: referenceText(fact),
      optional: fact.optional,
      ...withKi('fact', fact.id),
    })),
    ...reference.relationships.map((relationship, index) => ({
      kind: 'relationship' as const,
      type: relationship.type,
      referenceId: relationshipIds[index],
      reference: relationshipText(relationship, titles),
      optional: relationship.optional,
      ...withKi('relationship', relationshipIds[index]),
    })),
  ];

  const matchedKis = new Set(matches.flatMap(({ kiId }) => (kiId ? [kiId] : [])));
  const extras = typed
    .filter(({ ki }) => !matchedKis.has(ki.id))
    .map(({ ki, kind, type }) => ({ kind, type, kiId: ki.id, ki: kiLabel(ki) }));

  const byKind: Record<string, Tally> = Object.fromEntries(
    KINDS.map((kind) => [kind, emptyTally()])
  );
  const byType: Record<string, Tally> = {};
  const tallies = (kind: Kind, type: string): Tally[] => {
    byType[label(kind, type)] ??= emptyTally();
    return [byKind[kind], byType[label(kind, type)]];
  };
  for (const match of matches) {
    for (const tally of tallies(match.kind, match.type)) {
      tally.expected++;
      tally.required += match.optional ? 0 : 1;
      tally.matched += match.kiId ? 1 : 0;
      tally.matchedRequired += match.kiId && !match.optional ? 1 : 0;
      tally.sameType += match.kiId && match.sameType ? 1 : 0;
    }
  }
  for (const { kind, type } of typed) {
    for (const tally of tallies(kind, type)) {
      tally.produced++;
    }
  }
  return { ...(sample && { sample }), matches, extras, byKind, byType };
};

/** Recall of the required memories, precision of the KIs, and their F1. */
export const scoresOfTally = ({
  required,
  produced,
  matched,
  matchedRequired,
}: Tally): { recall: number; precision: number; f1: number } => {
  const recall = required === 0 ? 1 : matchedRequired / required;
  const precision = produced === 0 ? (required === 0 ? 1 : 0) : Math.min(matched / produced, 1);
  const f1 = recall + precision === 0 ? 0 : (2 * recall * precision) / (recall + precision);
  return { recall, precision, f1 };
};

/** The tallies of several comparisons, added up. */
export const sumTallies = (tallies: Array<Record<string, Tally>>): Record<string, Tally> => {
  const sum: Record<string, Tally> = {};
  for (const record of tallies) {
    for (const [key, tally] of Object.entries(record)) {
      const total = (sum[key] ??= emptyTally());
      for (const field of Object.keys(tally) as Array<keyof Tally>) {
        total[field] += tally[field];
      }
    }
  }
  return Object.fromEntries(Object.entries(sum).sort(([a], [b]) => a.localeCompare(b)));
};
