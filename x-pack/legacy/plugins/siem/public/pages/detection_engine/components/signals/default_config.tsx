/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import React from 'react';

import { esFilters } from '../../../../../../../../../src/plugins/data/common/es_query';
import { ColumnHeader } from '../../../../components/timeline/body/column_headers/column_header';
import { TimelineAction, TimelineActionProps } from '../../../../components/timeline/body/actions';
import { defaultColumnHeaderType } from '../../../../components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../../components/timeline/body/helpers';
import { SubsetTimelineModel, timelineDefaults } from '../../../../store/timeline/model';

import { FILTER_OPEN } from './signals_filter_group';
import { sendSignalsToTimelineAction, updateSignalStatusAction } from './actions';
import * as i18n from './translations';
import { CreateTimeline, SetEventsDeletedProps, SetEventsLoadingProps } from './types';

export const signalsOpenFilters: esFilters.Filter[] = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.status',
      params: {
        query: 'open',
      },
    },
    query: {
      match_phrase: {
        'signal.status': 'open',
      },
    },
  },
];

export const signalsClosedFilters: esFilters.Filter[] = [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.status',
      params: {
        query: 'closed',
      },
    },
    query: {
      match_phrase: {
        'signal.status': 'closed',
      },
    },
  },
];

export const buildSignalsRuleIdFilter = (ruleId: string): esFilters.Filter[] => [
  {
    meta: {
      alias: null,
      negate: false,
      disabled: false,
      type: 'phrase',
      key: 'signal.rule.id',
      params: {
        query: ruleId,
      },
    },
    query: {
      match_phrase: {
        'signal.rule.id': ruleId,
      },
    },
  },
];

export const signalsHeaders: ColumnHeader[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.name',
    label: i18n.SIGNALS_HEADERS_RULE,
    width: DEFAULT_COLUMN_MIN_WIDTH,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.type',
    label: i18n.SIGNALS_HEADERS_METHOD,
    width: 80,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.severity',
    label: i18n.SIGNALS_HEADERS_SEVERITY,
    width: 80,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.risk_score',
    label: i18n.SIGNALS_HEADERS_RISK_SCORE,
    width: 120,
  },
  {
    category: 'event',
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.action',
    type: 'string',
    aggregatable: true,
    width: 140,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.category',
    width: 150,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
    width: 120,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    width: DEFAULT_DATE_COLUMN_MIN_WIDTH,
  },
];

export const signalsDefaultModel: SubsetTimelineModel = {
  ...timelineDefaults,
  columns: signalsHeaders,
  showCheckboxes: true,
  showRowRenderers: false,
};

export const requiredFieldsForActions = [
  '@timestamp',
  'signal.original_time',
  'signal.rule.filters',
  'signal.rule.from',
  'signal.rule.language',
  'signal.rule.query',
  'signal.rule.to',
  'signal.rule.id',
];

export const getSignalsActions = ({
  setEventsLoading,
  setEventsDeleted,
  createTimeline,
  status,
  kbnVersion,
}: {
  setEventsLoading: ({ eventIds, isLoading }: SetEventsLoadingProps) => void;
  setEventsDeleted: ({ eventIds, isDeleted }: SetEventsDeletedProps) => void;
  createTimeline: CreateTimeline;
  status: 'open' | 'closed';
  kbnVersion: string;
}): TimelineAction[] => [
  {
    getAction: ({ eventId, data }: TimelineActionProps): JSX.Element => (
      <EuiToolTip
        data-test-subj="send-signal-to-timeline-tool-tip"
        content={i18n.ACTION_VIEW_IN_TIMELINE}
      >
        <EuiButtonIcon
          data-test-subj={'send-signal-to-timeline-tool-tip'}
          onClick={() => sendSignalsToTimelineAction({ createTimeline, data: [data] })}
          iconType="tableDensityNormal"
          aria-label="Next"
        />
      </EuiToolTip>
    ),
    id: 'sendSignalToTimeline',
    width: 26,
  },
  {
    getAction: ({ eventId, data }: TimelineActionProps): JSX.Element => (
      <EuiToolTip
        data-test-subj="update-signal-status-tool-tip"
        content={status === FILTER_OPEN ? i18n.ACTION_OPEN_SIGNAL : i18n.ACTION_CLOSE_SIGNAL}
      >
        <EuiButtonIcon
          data-test-subj={'update-signal-status-button'}
          onClick={() =>
            updateSignalStatusAction({
              signalIds: [eventId],
              status,
              setEventsLoading,
              setEventsDeleted,
              kbnVersion,
            })
          }
          iconType={status === FILTER_OPEN ? 'indexOpen' : 'indexClose'}
          aria-label="Next"
        />
      </EuiToolTip>
    ),
    id: 'updateSignalStatus',
    width: 26,
  },
];
