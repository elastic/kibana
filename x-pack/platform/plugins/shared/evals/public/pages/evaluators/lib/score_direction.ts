/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from '@kbn/evals-common';
import * as i18n from '../translations';

export const SCORE_DIRECTION_LABELS: Record<Direction, string> = {
  maximize: i18n.MAXIMIZE_DIRECTION,
  minimize: i18n.MINIMIZE_DIRECTION,
  neutral: i18n.NEUTRAL_DIRECTION,
};

export const SCORE_DIRECTION_OPTIONS: ReadonlyArray<{ value: Direction; text: string }> = [
  { value: 'maximize', text: i18n.MAXIMIZE_DIRECTION },
  { value: 'minimize', text: i18n.MINIMIZE_DIRECTION },
  { value: 'neutral', text: i18n.NEUTRAL_DIRECTION },
];
