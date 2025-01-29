/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core/public';

import type { SolutionView } from '../../common';

export enum EventType {
  SPACE_SOLUTION_CHANGED = 'space_solution_changed',
  SPACE_CHANGED = 'space_changed',
}

export enum FieldType {
  ACTION = 'action',
  SPACE_ID = 'space_id',
  SPACE_ID_PREV = 'space_id_prev',
  SOLUTION = 'solution',
  SOLUTION_PREV = 'solution_prev',
}

export class EventTracker {
  constructor(private analytics: Pick<AnalyticsServiceStart, 'reportEvent'>) {}

  private track(eventType: string, eventFields: object) {
    try {
      this.analytics.reportEvent(eventType, eventFields);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }

  /**
   * Track whenever the space "solution" is changed.
   */
  public spaceSolutionChanged({
    spaceId,
    action,
    solution,
    solutionPrev,
  }: {
    spaceId: string;
    action: 'create' | 'edit';
    solution: SolutionView;
    solutionPrev?: SolutionView;
  }) {
    this.track(EventType.SPACE_SOLUTION_CHANGED, {
      [FieldType.SPACE_ID]: spaceId,
      [FieldType.SOLUTION]: solution,
      [FieldType.SOLUTION_PREV]: solutionPrev,
      [FieldType.ACTION]: action,
    });
  }

  /**
   * Track whenever the user changes space.
   */
  public changeSpace({
    prevSpaceId,
    prevSolution,
    nextSpaceId,
    nextSolution,
  }: {
    prevSpaceId: string;
    prevSolution?: SolutionView;
    nextSpaceId: string;
    nextSolution?: SolutionView;
  }) {
    this.track(EventType.SPACE_CHANGED, {
      [FieldType.SPACE_ID]: nextSpaceId,
      [FieldType.SPACE_ID_PREV]: prevSpaceId,
      [FieldType.SOLUTION]: nextSolution,
      [FieldType.SOLUTION_PREV]: prevSolution,
    });
  }
}
