/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PipelineResult } from './validate';
import { partialShuffleArray } from '../../../common';

/**
 * Selects a subset of results for further processing from the given list.
 *
 * The shuffle is deterministic and reproducible, based on the default seed.
 *
 * @param pipelineResults - An array of PipelineResult objects to select from.
 * @param maxSamples - The maximum number of samples to select.
 * @returns An array of PipelineResult objects, containing up to `maxSamples` elements and their indices.
 */
export function selectResults(
  pipelineResults: PipelineResult[],
  maxSamples: number,
  avoidIndices: Set<number>
): [PipelineResult[], number[]] {
  const numSamples = Math.min(pipelineResults.length, maxSamples);
  const indices = Array.from({ length: pipelineResults.length }, (_, i) => i).filter(
    (i) => !avoidIndices.has(i)
  );
  if (indices.length < numSamples) {
    const avoidIndicesList = Array.from(avoidIndices).sort();
    partialShuffleArray(avoidIndicesList, 0, numSamples - indices.length);
    avoidIndicesList.length = numSamples - indices.length;
    indices.push(...avoidIndicesList);
  }
  partialShuffleArray(indices, 0, numSamples);
  indices.length = numSamples;
  return [indices.map((i) => pipelineResults[i]), indices];
}

/**
 * Converts a PipelineResult object into its categorization.
 *
 * @param {PipelineResult} result - The result object from the pipeline containing event details.
 * @returns {string[]} An array of strings combining event categories and types. Returns an empty array if event, event.category, or event.type is missing.
 */
function toCategorization(result: PipelineResult): string[] {
  const event = result?.event;
  if (!event || !event.category || !event.type) {
    return [];
  }
  return [...event.category.sort(), ...event.type.sort()];
}

/**
 * Compares two arrays of strings for equality.
 *
 * @param arr1 - The first array of strings to compare.
 * @param arr2 - The second array of strings to compare.
 * @returns the equality predicate
 */
export function stringArraysEqual(arr1: string[], arr2: string[]): boolean {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

/**
 * Compares two arrays of pipeline results and returns a set of indices where the categorization differs.
 *
 * @param pipelineResults - The current array of pipeline results.
 * @param previousPipelineResults - The previous array of pipeline results to compare against.
 * @returns A set of indices where the pipeline results differ in event category or type.
 */
export function diffCategorization(
  pipelineResults: PipelineResult[],
  previousPipelineResults: PipelineResult[]
): Set<number> {
  const diff = Array.from({ length: pipelineResults.length }, (_, i) => i).filter((i) => {
    const category1 = toCategorization(pipelineResults[i]);
    const category2 = toCategorization(previousPipelineResults[i]);
    return !stringArraysEqual(category1, category2);
  });
  return new Set(diff);
}
