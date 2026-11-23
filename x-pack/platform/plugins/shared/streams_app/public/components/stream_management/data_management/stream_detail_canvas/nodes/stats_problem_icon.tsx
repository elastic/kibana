/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIconTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

type StatsProblem =
  | { problem: 'stale' }
  | { problem: 'error'; reason: string }
  | { problem: 'partial'; reason: string };

type StatsProblemIconProps = { dataTestSubj: string } & StatsProblem;

const getTooltip = (props: StatsProblem): string => {
  switch (props.problem) {
    case 'stale':
      return i18n.translate('xpack.streams.canvas.staleStatsTooltip', {
        defaultMessage: 'Could not refresh. Showing the last known values.',
      });
    case 'error':
      return i18n.translate('xpack.streams.canvas.statsErrorTooltip', {
        defaultMessage: 'Could not load stats. {reason}',
        values: { reason: props.reason },
      });
    case 'partial':
      return i18n.translate('xpack.streams.canvas.partialStatsTooltip', {
        defaultMessage: 'Some stats could not be loaded. {reason}',
        values: { reason: props.reason },
      });
  }
};

/**
 * Marks a node whose stats have a problem, so a gap or an old number is never mistaken for a
 * measurement. `stale`: the last refresh failed, and the numbers are the last known ones. `error`:
 * the stats could not be loaded, so there are none to show. `partial`: part of the stats could not
 * be loaded, such as the failure rates, and the numbers that are shown are real.
 */
export const StatsProblemIcon = ({ dataTestSubj, ...props }: StatsProblemIconProps) => (
  <EuiIconTip
    type="warning"
    color="warning"
    size="s"
    anchorProps={{ 'data-test-subj': dataTestSubj }}
    content={getTooltip(props)}
  />
);
