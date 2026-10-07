/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Direction } from './schemas/common_attributes.gen';

/**
 * The direction of a judge score that declares none. Every score written before scores could
 * declare one was read as higher-is-better, and must keep reading that way.
 */
export const DEFAULT_JUDGE_SCORE_DIRECTION: Direction = 'maximize';

/** Resolves a judge score's direction, applying the default when it declares none. */
export const getJudgeScoreDirection = ({ direction }: { direction?: Direction }): Direction =>
  direction ?? DEFAULT_JUDGE_SCORE_DIRECTION;
