/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  compareMemories,
  endsOf,
  factScore,
  hasKeyword,
  nameScore,
  scoresOfTally,
  sumTallies,
  wordsOf,
} from './compare';
import { parseReferenceMemories } from './reference';
import type { DumpedKi } from './types';

const options = { factThreshold: 0.5, entityThreshold: 0.6 };

const ki = (
  id: string,
  type: string,
  title: string,
  content = '',
  extra: Partial<DumpedKi> = {}
) => ({
  id,
  type,
  title,
  content,
  ...extra,
});

const relationship = (id: string, relation: string, from: string, to: string): DumpedKi =>
  ki(id, 'memory.relationship', `${from} ${relation} ${to}`, '', {
    attributes: { 'relationship.relation': relation },
    references: [
      { uri: `ki://${from}`, relation: 'relates_to', description: 'from' },
      { uri: `ki://${to}`, relation: 'relates_to', description: 'to' },
      { uri: 'trace://abc', relation: 'derived_from' },
    ],
  });

const reference = parseReferenceMemories(
  {
    entities: [
      { id: 'e1', type: 'person', title: 'Rachel Green', aliases: ['Rach'] },
      { id: 'e2', type: 'organization', title: "Joe's Tackle Shop" },
      { id: 'e3', type: 'place', title: 'Lisbon', optional: true },
    ],
    facts: [
      {
        id: 'f1',
        type: 'life_event',
        title: 'Graduated in business administration',
        content: 'The user graduated with a degree in Business Administration.',
        keywords: ['Business Administration'],
      },
      {
        id: 'f2',
        type: 'routine',
        title: 'Daily commute',
        content: 'The user commutes 45 minutes each way to work.',
        keywords: ['45 minutes'],
      },
      {
        id: 'f3',
        type: 'preference',
        title: 'Avoids afternoon caffeine',
        content: 'The user avoids coffee after 4 PM.',
        keywords: ['coffee', '4 PM'],
      },
    ],
    relationships: [
      { type: 'knows', from: 'e1', to: 'e2' },
      { type: 'about', from: 'f1', to: 'e1' },
    ],
  },
  'reference.json'
);

describe('memory comparison', () => {
  it('compares words without case, accents, stop words or plural s', () => {
    expect(wordsOf('The Cafés of São Paulo, and its 3 bakeries!')).toEqual([
      'cafe',
      'sao',
      'paulo',
      '3',
      'bakerie',
    ]);
    expect(hasKeyword('4:00 PM', new Set(wordsOf('after 4:00 pm sharp')))).toBe(true);
    expect(hasKeyword('45 minutes', new Set(wordsOf('a 40 minute commute')))).toBe(false);
  });

  it('scores names: equal, one within the other, or sharing words', () => {
    expect(nameScore('Rachel Green', 'rachel green')).toBe(1);
    expect(nameScore('Rachel Green', 'Rachel')).toBe(0.8);
    expect(nameScore('Rachel Green', 'Ross Geller')).toBe(0);
  });

  it('needs the keywords of a fact, whatever the wording', () => {
    const [, commute] = reference.facts;

    expect(
      factScore(
        commute,
        ki('k', 'fact.routine', 'Commute', 'Takes 45 minutes to get to the office.')
      )
    ).toBeGreaterThanOrEqual(0.6);
    expect(
      factScore(
        commute,
        ki('k', 'fact.routine', 'Daily commute', 'The user commutes 40 minutes each way to work.')
      )
    ).toBeLessThan(0.5);
  });

  it('matches one to one, counts what is missing and extra, and links relationships through their ends', () => {
    const kis = [
      ki('k-rachel', 'entity.person', 'Rachel'),
      ki('k-rachel-2', 'entity.person', 'Rachel Green'),
      ki('k-shop', 'entity.place', "Joe's Tackle Shop"),
      ki('k-degree', 'fact.life_event', 'Degree', 'Graduated in Business Administration in 2019.'),
      ki('k-commute', 'fact.routine', 'Commute', 'A 40 minute drive.'),
      ki('k-other', 'fact.plan', 'Trip', 'Plans to visit Japan.'),
      relationship('r-knows', 'knows', 'k-shop', 'k-rachel-2'),
      relationship('r-about', 'about', 'k-degree', 'k-rachel'),
    ];
    const { matches, extras, byKind, byType } = compareMemories(reference, kis, options, 's1');
    const kiOf = (id: string) => matches.find(({ referenceId }) => referenceId === id)?.kiId;

    expect(kiOf('e1')).toBe('k-rachel-2');
    expect(kiOf('e2')).toBe('k-shop');
    expect(matches.find(({ referenceId }) => referenceId === 'e2')?.sameType).toBe(false);
    expect(kiOf('f1')).toBe('k-degree');
    expect(kiOf('f2')).toBeUndefined();
    expect(kiOf('r1')).toBe('r-knows');
    expect(kiOf('r2')).toBeUndefined();
    expect(extras.map(({ kiId }) => kiId)).toEqual(['k-rachel', 'k-commute', 'k-other', 'r-about']);

    expect(byKind.entity).toEqual({
      expected: 3,
      required: 2,
      produced: 3,
      matched: 2,
      matchedRequired: 2,
      sameType: 1,
    });
    expect(byKind.fact).toEqual(
      expect.objectContaining({ expected: 3, required: 3, produced: 3, matchedRequired: 1 })
    );
    expect(byType['fact.plan']).toEqual(expect.objectContaining({ expected: 0, produced: 1 }));
    expect(scoresOfTally(byKind.entity)).toEqual({
      recall: 1,
      precision: 2 / 3,
      f1: 0.8,
    });
  });

  it('reads the ends of a relationship KI and adds up tallies', () => {
    expect(endsOf(relationship('r', 'knows', 'a', 'b'))).toEqual({ from: 'a', to: 'b' });
    const tally = {
      expected: 1,
      required: 1,
      produced: 2,
      matched: 1,
      matchedRequired: 1,
      sameType: 1,
    };
    expect(sumTallies([{ fact: tally }, { fact: tally, entity: tally }])).toEqual({
      entity: tally,
      fact: { expected: 2, required: 2, produced: 4, matched: 2, matchedRequired: 2, sameType: 2 },
    });
  });

  it('rejects reference memories with a repeated id or a relationship to nothing', () => {
    expect(() =>
      parseReferenceMemories(
        {
          entities: [{ id: 'e1', type: 'person', title: 'A' }],
          facts: [{ id: 'e1', type: 'plan', title: 'B', content: 'C' }],
          relationships: [{ type: 'knows', from: 'e1', to: 'e9' }],
        },
        'bad.json'
      )
    ).toThrow(/id 'e1' is used twice\nrelationship e1 knows e9: no entity or fact 'e9'/);
    expect(() => parseReferenceMemories({ facts: [{ id: 'f1' }] }, 'bad.json')).toThrow(
      'Invalid reference memories bad.json'
    );
  });
});
