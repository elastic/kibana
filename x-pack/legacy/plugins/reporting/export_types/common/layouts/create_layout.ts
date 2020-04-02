/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReportingConfigType } from '../../../server/core';
import { LayoutTypes } from '../constants';
import { Layout, LayoutParams } from './layout';
import { PreserveLayout } from './preserve_layout';
import { PrintLayout } from './print_layout';

export function createLayout(
  captureConfig: ReportingConfigType['capture'],
  layoutParams?: LayoutParams
): Layout {
  if (layoutParams && layoutParams.id === LayoutTypes.PRESERVE_LAYOUT) {
    return new PreserveLayout(layoutParams.dimensions);
  }

  // this is the default because some jobs won't have anything specified
  return new PrintLayout(captureConfig);
}
