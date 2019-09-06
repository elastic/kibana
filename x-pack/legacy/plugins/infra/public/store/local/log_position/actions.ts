/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { TimeKey } from '../../../../common/time';

const actionCreator = actionCreatorFactory('x-pack/infra/local/log_position');

export const jumpToTargetPosition = actionCreator<TimeKey>('JUMP_TO_TARGET_POSITION');

export const jumpToTargetPositionTime = (time: number, fromAutoReload: boolean = false) =>
  jumpToTargetPosition({
    tiebreaker: 0,
    time,
    fromAutoReload,
  });

export interface ReportVisiblePositionsPayload {
  pagesAfterEnd: number;
  pagesBeforeStart: number;
  endKey: TimeKey | null;
  middleKey: TimeKey | null;
  startKey: TimeKey | null;
  fromScroll: boolean;
}

export const reportVisiblePositions = actionCreator<ReportVisiblePositionsPayload>(
  'REPORT_VISIBLE_POSITIONS'
);

export const startAutoReload = actionCreator('START_AUTO_RELOAD');
export const stopAutoReload = actionCreator('STOP_AUTO_RELOAD');

export const lockAutoReloadScroll = actionCreator('LOCK_AUTO_RELOAD_SCROLL');
export const unlockAutoReloadScroll = actionCreator('UNLOCK_AUTO_RELOAD_SCROLL');
