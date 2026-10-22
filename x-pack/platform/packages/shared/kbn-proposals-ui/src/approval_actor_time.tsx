/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import { EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DATE_TIME_FORMAT } from './proposal_helpers';

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
 * "Kate Sosedova • 3 sec ago" — the one who/when line every state of a proposal shows, in the
 * flyout row and the modal header alike, so the two never word the same fact differently. The
 * outcome itself (applied, declined, failed…) is the badge's to say. A tooltip on the time shows
 * the full date and time.
 */
export const ApprovalActorTime = ({ actorName, at, isUnknown = false }: ApprovalActorTimeProps) => {
  const { euiTheme } = useEuiTheme();
  const now = useNow(at);
  const name = (
    <span css={isUnknown ? css({ color: euiTheme.colors.textDisabled }) : undefined}>
      {actorName}
    </span>
  );

  if (at === undefined) {
    return name;
  }

  return (
    <>
      {name}
      {' • '}
      <EuiToolTip content={moment(at).format(DATE_TIME_FORMAT)}>
        <span tabIndex={0}>{formatAgo(at, now)}</span>
      </EuiToolTip>
    </>
  );
};
