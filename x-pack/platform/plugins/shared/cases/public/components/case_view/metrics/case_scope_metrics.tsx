/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import prettyMilliseconds from 'pretty-ms';
import { EuiSkeletonText, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { SingleCaseMetrics, SingleCaseMetricsFeature } from '../../../../common/ui';
import { CaseMetricsFeature } from '../../../../common/types/api';
import * as i18n from './translations';

const EMPTY = '—';
const duration = (ms: number) =>
  ms > 0 ? prettyMilliseconds(ms, { compact: true, verbose: true }) : EMPTY;

interface MetricItem {
  key: string;
  label: string;
  value: React.ReactNode;
}

const getItems = (
  metrics: SingleCaseMetrics,
  features: SingleCaseMetricsFeature[]
): MetricItem[] => {
  const items: MetricItem[] = [];
  const has = (feature: SingleCaseMetricsFeature) => features.includes(feature);

  if (has(CaseMetricsFeature.ALERTS_COUNT)) {
    items.push({
      key: 'alerts',
      label: i18n.SCOPE_METRIC_ALERTS,
      value: metrics.alerts?.count ?? 0,
    });
  }
  if (has(CaseMetricsFeature.ALERTS_HOSTS)) {
    items.push({
      key: 'alert-hosts',
      label: i18n.SCOPE_METRIC_ALERT_HOSTS,
      value: metrics.alerts?.hosts?.total ?? 0,
    });
  }
  if (has(CaseMetricsFeature.ALERTS_USERS)) {
    items.push({
      key: 'alert-users',
      label: i18n.SCOPE_METRIC_ALERT_USERS,
      value: metrics.alerts?.users?.total ?? 0,
    });
  }
  if (has(CaseMetricsFeature.CONNECTORS)) {
    items.push({
      key: 'connectors',
      label: i18n.SCOPE_METRIC_CONNECTORS,
      value: metrics.connectors?.total ?? 0,
    });
  }

  const lifespan = has(CaseMetricsFeature.LIFESPAN) ? metrics.lifespan : undefined;
  if (lifespan) {
    const { creationDate, closeDate, statusInfo } = lifespan;
    const reopens = statusInfo.reopenDates;
    items.push(
      {
        key: 'created',
        label: i18n.SCOPE_METRIC_CREATED,
        value: moment(creationDate).format('LLL'),
      },
      { key: 'open', label: i18n.SCOPE_METRIC_OPEN, value: duration(statusInfo.openDuration) },
      {
        key: 'in-progress',
        label: i18n.SCOPE_METRIC_IN_PROGRESS,
        value: duration(statusInfo.inProgressDuration),
      },
      {
        key: 'paused',
        label: i18n.SCOPE_METRIC_PAUSED,
        value: duration(statusInfo.pausedDuration),
      },
      {
        key: 'to-close',
        label: i18n.SCOPE_METRIC_TO_CLOSE,
        value: closeDate ? duration(moment(closeDate).diff(moment(creationDate))) : EMPTY,
      },
      {
        key: 'reopened',
        label: i18n.SCOPE_METRIC_REOPENED,
        value:
          reopens.length > 0 ? (
            <EuiToolTip
              content={reopens.map((date) => (
                <div key={date}>{moment(date).format('LLL')}</div>
              ))}
            >
              <span tabIndex={0}>{i18n.SCOPE_METRIC_TIMES(reopens.length)}</span>
            </EuiToolTip>
          ) : (
            i18n.SCOPE_METRIC_TIMES(0)
          ),
      }
    );
  }
  return items;
};

/** Every case metric as one wrapping line of small label-value pairs, under Scope's blocks. */
export const CaseScopeMetrics = React.memo(
  ({
    metrics,
    features,
    isLoading,
  }: {
    metrics: SingleCaseMetrics | undefined;
    features: SingleCaseMetricsFeature[];
    isLoading: boolean;
  }) => {
    const { euiTheme } = useEuiTheme();
    if (features.length === 0) {
      return null;
    }
    if (isLoading || !metrics) {
      return (
        <EuiSkeletonText lines={1} size="s" data-test-subj="case-view-scope-metrics-loading" />
      );
    }

    const subdued = { color: euiTheme.colors.textSubdued };
    return (
      <EuiText size="xs" data-test-subj="case-view-scope-metrics" aria-label={i18n.SCOPE_METRICS}>
        {getItems(metrics, features).map(({ key, label, value }, index) => (
          <React.Fragment key={key}>
            {index > 0 && <span css={subdued}>{' · '}</span>}
            {/* Each pair stays on one line; the line breaks only between pairs. */}
            <span className="eui-textNoWrap" data-test-subj={`case-view-scope-metric-${key}`}>
              <span css={subdued}>{label}</span> <strong>{value}</strong>
            </span>
          </React.Fragment>
        ))}
      </EuiText>
    );
  }
);
CaseScopeMetrics.displayName = 'CaseScopeMetrics';
