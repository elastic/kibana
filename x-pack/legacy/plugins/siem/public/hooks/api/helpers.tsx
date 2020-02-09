/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexPatternSavedObject } from '../types';

/**
 * Returns a string array of Index Pattern Titles
 *
 * @param indexPatterns IndexPatternSavedObject[] as provided from the useIndexPatterns() hook
 */
export const getIndexPatternTitles = (indexPatterns: IndexPatternSavedObject[]): string[] =>
  indexPatterns.reduce<string[]>((acc, v) => [...acc, v.attributes.title], []);

/**
 * Returns a mapping of indexPatternTitle to indexPatternId
 *
 * @param indexPatterns IndexPatternSavedObject[] as provided from the useIndexPatterns() hook
 */
export const getIndexPatternTitleIdMapping = (
  indexPatterns: IndexPatternSavedObject[]
): Array<{ title: string; id: string }> =>
  indexPatterns.reduce<Array<{ title: string; id: string }>>((acc, v) => {
    if (v.attributes && v.attributes.title) {
      return [...acc, { title: v.attributes.title, id: v.id }];
    } else {
      return acc;
    }
  }, []);
