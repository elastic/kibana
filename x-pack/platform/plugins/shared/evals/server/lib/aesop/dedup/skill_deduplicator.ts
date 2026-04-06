/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

const PROPOSED_SKILLS_INDEX = '.aesop-proposed-skills';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
]);

const SIMILARITY_THRESHOLD = 0.6;
const NAME_WEIGHT = 0.6;
const INDEX_WEIGHT = 0.4;

export interface SkillSummary {
  id: string;
  name: string;
  sourceIndices: string[];
  confidence?: number;
}

export interface DuplicateMatch {
  proposedId: string;
  existingId: string;
  similarity: number;
  nameSimilarity: number;
  indexOverlap: number;
}

export class SkillDeduplicator {
  /**
   * Jaccard similarity index on two string arrays: |intersection| / |union|.
   * Returns 0 when both sets are empty.
   */
  static jaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);

    if (setA.size === 0 && setB.size === 0) {
      return 0;
    }

    let intersectionSize = 0;
    for (const item of setA) {
      if (setB.has(item)) {
        intersectionSize++;
      }
    }

    const unionSize = new Set([...setA, ...setB]).size;
    return intersectionSize / unionSize;
  }

  /**
   * Tokenize text into lowercase words, filtering out stopwords.
   */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 0 && !STOPWORDS.has(word));
  }

  /**
   * Name similarity: Jaccard index on tokenized names.
   */
  static nameSimilarity(a: string, b: string): number {
    const tokensA = SkillDeduplicator.tokenize(a);
    const tokensB = SkillDeduplicator.tokenize(b);
    return SkillDeduplicator.jaccardSimilarity(tokensA, tokensB);
  }

  /**
   * Index overlap: Jaccard index on source index arrays.
   */
  static indexOverlap(a: string[], b: string[]): number {
    return SkillDeduplicator.jaccardSimilarity(a, b);
  }

  /**
   * Compute weighted similarity: 0.6 * nameSimilarity + 0.4 * indexOverlap.
   */
  static computeSimilarity(proposed: SkillSummary, existing: SkillSummary): number {
    const nameScore = SkillDeduplicator.nameSimilarity(proposed.name, existing.name);
    const indexScore = SkillDeduplicator.indexOverlap(
      proposed.sourceIndices,
      existing.sourceIndices
    );
    return NAME_WEIGHT * nameScore + INDEX_WEIGHT * indexScore;
  }

  /**
   * Find duplicates between proposed and existing skills.
   * Returns matches with similarity >= 0.6.
   */
  static findDuplicates(proposed: SkillSummary[], existing: SkillSummary[]): DuplicateMatch[] {
    const matches: DuplicateMatch[] = [];

    for (const p of proposed) {
      for (const e of existing) {
        const nameScore = SkillDeduplicator.nameSimilarity(p.name, e.name);
        const indexScore = SkillDeduplicator.indexOverlap(p.sourceIndices, e.sourceIndices);
        const similarity = NAME_WEIGHT * nameScore + INDEX_WEIGHT * indexScore;

        if (similarity >= SIMILARITY_THRESHOLD) {
          matches.push({
            proposedId: p.id,
            existingId: e.id,
            similarity,
            nameSimilarity: nameScore,
            indexOverlap: indexScore,
          });
        }
      }
    }

    return matches;
  }

  /**
   * Within a batch, group by similarity and keep the highest confidence skill.
   */
  static deduplicate(skills: SkillSummary[]): SkillSummary[] {
    if (skills.length <= 1) {
      return skills;
    }

    // Track which skills have been marked as duplicates (lower confidence)
    const removedIds = new Set<string>();

    for (let i = 0; i < skills.length; i++) {
      if (removedIds.has(skills[i].id)) {
        continue;
      }
      for (let j = i + 1; j < skills.length; j++) {
        if (removedIds.has(skills[j].id)) {
          continue;
        }

        const similarity = SkillDeduplicator.computeSimilarity(skills[i], skills[j]);
        if (similarity >= SIMILARITY_THRESHOLD) {
          // Keep the one with higher confidence, remove the other
          const confI = skills[i].confidence ?? 0;
          const confJ = skills[j].confidence ?? 0;
          if (confI >= confJ) {
            removedIds.add(skills[j].id);
          } else {
            removedIds.add(skills[i].id);
            break; // Stop comparing — this skill is already removed
          }
        }
      }
    }

    return skills.filter((s) => !removedIds.has(s.id));
  }

  /**
   * Query existing proposed skills from ES and filter out duplicates.
   * Handles missing index (404) gracefully by returning proposed unchanged.
   */
  static async deduplicateAgainstExisting(
    esClient: ElasticsearchClient,
    proposed: SkillSummary[],
    logger: Logger
  ): Promise<SkillSummary[]> {
    if (proposed.length === 0) {
      return proposed;
    }

    let existingSkills: SkillSummary[];
    try {
      const response = await esClient.search({
        index: PROPOSED_SKILLS_INDEX,
        size: 1000,
        _source: ['name', 'source.source_indices', 'confidence'],
      });

      existingSkills = response.hits.hits.map((hit) => {
        const source = hit._source as {
          name?: string;
          source?: { source_indices?: string[] };
          confidence?: number;
        };
        return {
          id: hit._id!,
          name: source?.name ?? '',
          sourceIndices: source?.source?.source_indices ?? [],
          confidence: source?.confidence,
        };
      });
    } catch (error: unknown) {
      const statusCode =
        error && typeof error === 'object' && 'meta' in error
          ? (error as { meta?: { statusCode?: number } }).meta?.statusCode
          : undefined;

      if (statusCode === 404) {
        logger.debug(
          `[AESOP] Proposed skills index does not exist yet, skipping deduplication against existing`
        );
        return proposed;
      }
      logger.warn(
        `[AESOP] Failed to query existing skills for deduplication, skipping: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return proposed;
    }

    if (existingSkills.length === 0) {
      return proposed;
    }

    const duplicates = SkillDeduplicator.findDuplicates(proposed, existingSkills);
    const duplicateProposedIds = new Set(duplicates.map((d) => d.proposedId));

    if (duplicateProposedIds.size > 0) {
      logger.info(
        `[AESOP] Deduplication removed ${duplicateProposedIds.size} skills that overlap with existing proposed skills`
      );
    }

    return proposed.filter((s) => !duplicateProposedIds.has(s.id));
  }
}
