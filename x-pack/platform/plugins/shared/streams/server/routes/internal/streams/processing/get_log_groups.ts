/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProbabilisticTrie } from './probabilistic_trie';

export interface LogGroup {
  pattern: string;
  probability: number;
  logs: string[];
  children: LogGroup[];
}

/**
 * Groups a list of logs by pattern and calculates their probability.
 */
export function getLogGroups(
  logs: string[],
  maxDepth = 2,
  splitChunks = (log: string) => splitLogSeparators(getBasicPattern(log))
) {
  if (maxDepth <= 0) {
    throw new Error('maxDepth must be greater than 0');
  }

  // Generate log patterns and split into chunks
  const logPatterns = logs.map((log) => [...splitChunks(log), log]); // Append the raw log message to the list of chunks so we've got it available for later (This does not affect probabilities but saves us a lookup step afterwards)
  const trie = ProbabilisticTrie.fromArray(logPatterns);

  const output: LogGroup[] = [];
  const currentGroups: LogGroup[] = [];
  for (const [level, chunks, probability, node] of trie) {
    // We appended the raw log message to the list of chunks, so need to remove it off any leaf node first
    let rawMessage: string | undefined;
    if (node.isLeaf()) {
      rawMessage = chunks.pop();
    }
    const pattern = chunks.join('');

    // Build tree of pattern groups until we reach max depth
    if (level <= maxDepth - 1) {
      const nextGroup: LogGroup = {
        pattern,
        probability,
        logs: [],
        children: [],
      };
      if (nextGroup.pattern !== currentGroups[currentGroups.length - 1]?.pattern) {
        currentGroups.splice(level, currentGroups.length - level, nextGroup);
        if (level === 0) {
          output.push(nextGroup);
        } else {
          currentGroups[level - 1].children.push(nextGroup);
        }
      }
    }

    // Otherwise, simply add the raw log message to the current pattern group
    if (rawMessage) {
      currentGroups[currentGroups.length - 1].logs.push(rawMessage);
    }
  }

  return output;
}

/**
 * Splits a log message into chunks (separated either by whitespace or major log separator).
 */
export function splitLogSeparators(value: string) {
  return value.split(/(\s+|\[|\]|\|)/).filter((chunk) => chunk);
}

/**
 * Turns a log message into a very basic pattern, replacing each word and digit with a single character.
 */
export function getBasicPattern(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/\d+/g, '0')
    .replace(/[A-Za-z][\w/\\]*/g, 'a')
    .replace(/a([ /\.]a)+/g, 'a');
}

/**
 * Recursively sorts log groups by probability in descending order.
 */
export function sortByProbability(groups: LogGroup[]) {
  groups.sort((a, b) => b.probability - a.probability);
  groups.forEach((group) => {
    if (group.children.length) {
      sortByProbability(group.children);
    }
  });
}

/**
 * Returns a list of sample logs ensuring each pattern group is represented evenly.
 */
export function getVariedSamples(group: LogGroup, numSamples: number) {
  const buckets = [group, ...group.children].filter((g) => g.logs.length > 0);
  const numBuckets = Math.min(buckets.length, numSamples);
  const logsPerBucket = Math.floor(numSamples / numBuckets);
  const remainder = numSamples % numBuckets;
  return buckets.reduce<string[]>((acc, bucket, i) => {
    let num = logsPerBucket;
    if (i === 0) {
      num += remainder;
    }
    acc.push(...bucket.logs.slice(0, num));
    return acc;
  }, []);
}
