/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { IndexPatternPrivateState } from '../indexpattern';
import { IndexPattern } from '../../../common';

export function getCurrentIndexPattern(state: IndexPatternPrivateState) {
  return state.indexPatternMap[state.currentIndexPatternId];
}

export function tryGetIndexPattern(
  id: string,
  indexPatternMap: Record<string, IndexPattern | undefined>
) {
  const indexPattern = indexPatternMap[id];

  if (!indexPattern) {
    throw new Error(
      i18n.translate('xpack.lens.indexpattern.suggestions.unloadedIndexPattern', {
        defaultMessage: 'The index pattern "{id}" has not been loaded.',
        values: { id },
      })
    );
  }

  return indexPattern;
}
