/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage, FormattedRelative, FormattedTime } from '@kbn/i18n-react';
import { selectUnit } from '@formatjs/intl-utils';

export interface ApprovalActorTimeProps {
  actorName: string;
  /**
   * ISO 8601 timestamp. Omitted only when the record genuinely carries none — rendering "by
   * {actorName}" alone rather than inventing a time, since a fabricated one would read as real
   * audit attribution and would keep changing on every reopen.
   */
  at?: string;
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

export const ApprovalActorTime = ({ actorName, at, live = false }: ApprovalActorTimeProps) => {
  if (at === undefined) {
    return (
      <FormattedMessage
        id="xpack.proposals.approvalActorTime.labelWithoutTime"
        defaultMessage="by {actorName}"
        values={{ actorName: <strong>{actorName}</strong> }}
      />
    );
  }

  const { unit } = selectUnit(new Date(at));

  return (
    <FormattedMessage
      id="xpack.proposals.approvalActorTime.label"
      defaultMessage="by {actorName} at {time}"
      values={{
        actorName: <strong>{actorName}</strong>,
        time: live ? (
          <FormattedRelative
            value={at}
            updateIntervalInSeconds={
              INCREMENTABLE_UNITS.includes(unit) ? UPDATE_INTERVAL_SECONDS : undefined
            }
          />
        ) : (
          <FormattedTime value={at} />
        ),
      }}
    />
  );
};
