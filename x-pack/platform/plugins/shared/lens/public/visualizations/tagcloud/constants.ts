/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { $Values } from '@kbn/utility-types';
import { Orientation } from '@kbn/expression-tagcloud-plugin/common';

export const DEFAULT_STATE = {
  maxFontSize: 72,
  minFontSize: 18,
  orientation: Orientation.SINGLE as $Values<typeof Orientation>,
  showLabel: true,
};
