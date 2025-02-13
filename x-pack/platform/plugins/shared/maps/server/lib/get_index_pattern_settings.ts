/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { DEFAULT_MAX_RESULT_WINDOW, DEFAULT_MAX_INNER_RESULT_WINDOW } from '../../common/constants';

export function getIndexPatternSettings(
  indicesSettingsResp: Record<string, string | number | boolean>
) {
  let maxResultWindow = Infinity;
  let maxInnerResultWindow = Infinity;
  Object.values(indicesSettingsResp).forEach((indexSettings) => {
    const indexMaxResultWindow = _.get(
      indexSettings,
      'settings.index.max_result_window',
      DEFAULT_MAX_RESULT_WINDOW
    );
    maxResultWindow = Math.min(maxResultWindow, indexMaxResultWindow);

    const indexMaxInnerResultWindow = _.get(
      indexSettings,
      'settings.index.max_inner_result_window',
      DEFAULT_MAX_INNER_RESULT_WINDOW
    );
    maxInnerResultWindow = Math.min(indexMaxInnerResultWindow, indexMaxResultWindow);
  });

  return {
    maxResultWindow: maxResultWindow === Infinity ? DEFAULT_MAX_RESULT_WINDOW : maxResultWindow,
    maxInnerResultWindow:
      maxInnerResultWindow === Infinity ? DEFAULT_MAX_INNER_RESULT_WINDOW : maxInnerResultWindow,
  };
}
