/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { formatDateTime } from './proposal_helpers';

export interface ApprovalActorTimeProps {
  actorName: string;
  /**
   * ISO 8601 timestamp. Omitted only when the record genuinely carries none — rendering the actor
   * alone rather than inventing a time, since a fabricated one would read as real audit
   * attribution and would keep changing on every reopen.
   */
  at?: string;
  /** The name is a fallback for an unknown decider, shown in the disabled text colour. */
  isUnknown?: boolean;
  /**
   * A decision still in flight: the time ages as it goes ("3 sec ago"). A settled one shows its
   * full date and time instead, so the record reads the same whenever it is opened.
   */
  live?: boolean;
}

/** Abbreviated on purpose ("3 sec ago"), which react-intl's relative-time formatter cannot do. */
const formatAgo = (at: string, now: number): string => {
  const seconds = Math.max(0, Math.floor((now - new Date(at).getTime()) / 1000));
  if (seconds < 60) {
    return i18n.translate('xpack.proposals.approvalActorTime.secondsAgo', {
      defaultMessage: '{count} sec ago',
      values: { count: seconds },
    });
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return i18n.translate('xpack.proposals.approvalActorTime.minutesAgo', {
      defaultMessage: '{count} min ago',
      values: { count: minutes },
    });
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return i18n.translate('xpack.proposals.approvalActorTime.hoursAgo', {
      defaultMessage: '{count} hr ago',
      values: { count: hours },
    });
  }
  return i18n.translate('xpack.proposals.approvalActorTime.daysAgo', {
    defaultMessage: '{count} {count, plural, one {day} other {days}} ago',
    values: { count: Math.floor(hours / 24) },
  });
};

/** Ticks every second while the time is still within the last minute, every minute after that. */
const useNow = (at: string | undefined): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === undefined) {
      return;
    }
    setNow(Date.now());
    const id = setInterval(
      () => setNow(Date.now()),
      Date.now() - new Date(at).getTime() < 60_000 ? 1000 : 60_000
    );
    return () => clearInterval(id);
  }, [at]);
  return now;
};

/**
 * "Kate Sosedova • 21 Oct 2026, 14:36" — the one who/when line every settled state of a proposal
 * shows, or "Kate Sosedova • 3 sec ago" while a decision is still in flight (`live`). The outcome
 * itself (applied, declined, failed…) is the badge's to say. A tooltip on the relative time shows
 * the full date and time.
 */
export const ApprovalActorTime = ({
  actorName,
  at,
  isUnknown = false,
  live = false,
}: ApprovalActorTimeProps) => {
  const { euiTheme } = useEuiTheme();
  const now = useNow(live ? at : undefined);
  const name = (
    <span css={isUnknown ? css({ color: euiTheme.colors.textDisabled }) : undefined}>
      {actorName}
    </span>
  );

  if (at === undefined) {
    return name;
  }

  if (!live) {
    return (
      <>
        {name}
        {' • '}
        {formatDateTime(at)}
      </>
    );
  }

  return (
    <>
      {name}
      {' • '}
      <EuiToolTip content={formatDateTime(at)}>
        <span tabIndex={0}>{formatAgo(at, now)}</span>
      </EuiToolTip>
    </>
  );
};
