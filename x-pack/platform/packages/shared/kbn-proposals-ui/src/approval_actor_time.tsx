/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n-react';
import { selectUnit } from '@formatjs/intl-utils';
import { formatDateTime } from './proposal_helpers';

export interface ApprovalActorTimeProps {
  actorName: string;
  /**
   * ISO 8601 timestamp. Omitted only when the record genuinely carries none — rendering the actor
   * alone rather than inventing a time, since a fabricated one would read as real audit
   * attribution and would keep changing on every reopen.
   */
  at?: string;
  /**
   * Ages itself as a relative time ("8 seconds ago") for a decision still in flight, with the full
   * date and time in a tooltip. A settled decision shows its full date and time instead, so the
   * record reads the same whenever it is opened.
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

/** "Kate Sosedova • 20 Oct 2026, 14:36": who decided and when. The badge says what the outcome was. */
export const ApprovalActorTime = ({ actorName, at, live = false }: ApprovalActorTimeProps) => {
  if (at === undefined) {
    return <>{actorName}</>;
  }

  if (!live) {
    return (
      <>
        {actorName}
        {' • '}
        {formatDateTime(at)}
      </>
    );
  }

  const { unit } = selectUnit(new Date(at));

  return (
    <>
      {actorName}
      {' • '}
      <EuiToolTip content={formatDateTime(at)}>
        <span tabIndex={0}>
          <FormattedRelative
            value={at}
            updateIntervalInSeconds={
              INCREMENTABLE_UNITS.includes(unit) ? UPDATE_INTERVAL_SECONDS : undefined
            }
          />
        </span>
      </EuiToolTip>
    </>
  );
};
