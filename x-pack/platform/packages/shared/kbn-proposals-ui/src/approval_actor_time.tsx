/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import { selectUnit } from '@formatjs/intl-utils';
import type { ApprovalOutcomeStatus } from './approval_outcome';

export interface ApprovalActorTimeProps {
  actorName: string;
  decisionType?: ApprovalOutcomeStatus;
  /** ISO 8601 timestamp. */
  at: string;
  /**
   * Ages itself as a relative time ("8s ago") for a decision still being submitted. A settled
   * decision renders the fixed clock time instead, matching what the proposal was actually
   * decided at rather than how long ago that now reads.
   */
  live?: boolean;
}

const UPDATE_INTERVAL_SECONDS = 1;

/** react-intl throws rather than schedule an update once the unit passes an hour. */
const INCREMENTABLE_UNITS: ReadonlyArray<ReturnType<typeof selectUnit>['unit']> = [
  'second',
  'minute',
  'hour',
];

export const ApprovalActorTime = ({
  actorName,
  decisionType,
  at,
  live = false,
}: ApprovalActorTimeProps) => {
  const { unit } = selectUnit(new Date(at));

  return (
    <>
      {decisionType && `${decisionType} by `}
      <strong>{actorName}</strong>
      {' at '}
      {live ? (
        <FormattedRelative
          value={at}
          updateIntervalInSeconds={
            INCREMENTABLE_UNITS.includes(unit) ? UPDATE_INTERVAL_SECONDS : undefined
          }
        />
      ) : (
        <FormattedTime value={at} />
      )}
    </>
  );
};
