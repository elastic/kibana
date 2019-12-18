/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DEFAULT_MAX_RESULT_WINDOW,
  DEFAULT_MAX_INNER_RESULT_WINDOW,
  GIS_API_PATH,
} from '../../../../common/constants';
import { kfetch } from 'ui/kfetch';

export async function loadIndexSettings(indexPatternTitle) {
  try {
    const indexSettings = await kfetch({
      pathname: `../${GIS_API_PATH}/indexSettings`,
      query: {
        indexPatternTitle,
      },
    });
    return indexSettings;
  } catch (err) {
    return {
      maxResultWindow: DEFAULT_MAX_RESULT_WINDOW,
      maxInnerResultWindow: DEFAULT_MAX_INNER_RESULT_WINDOW,
    };
  }
}
