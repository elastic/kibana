/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core/public';
import { AlertFieldsTable } from '@kbn/alerts-ui-shared';
import type { Alert } from '@kbn/alerting-types';
import { fetchClassicAlertById } from '@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id';
import { classicAlertQueryKeys } from '@kbn/alerting-v2-episodes-ui/classic_alerts/query_keys';
import type { ClassicAlertFields } from '@kbn/alerting-v2-episodes-ui/classic_alerts/types';
import {
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_START,
  ALERT_STATUS,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS,
} from '@kbn/rule-data-utils';
import * as i18n from './translations';

/** The classic rule types whose alerts the alerts find API returns for a subject. */
const CLASSIC_ALERT_RULE_TYPE_IDS = Array.from(
  new Set([...OBSERVABILITY_RULE_TYPE_IDS, ...STACK_RULE_TYPE_IDS])
);

type TabId = 'overview' | 'fields';

export interface ClassicAlertDetailsFlyoutProps {
  /** `kibana.alert.uuid`. */
  alertId: string;
  /** The alert's details page; rendered as the footer link when the alert has one. */
  detailsHref?: string;
  onClose: () => void;
  services: { http: HttpStart };
}

const asDisplayValue = (value: unknown): string => {
  if (value == null) {
    return '—';
  }
  if (Array.isArray(value)) {
    const joined = value.filter((entry) => entry != null).join(', ');
    return joined.length ? joined : '—';
  }
  return String(value);
};

/** Milliseconds from the alert's `kibana.alert.duration.us`, which is microseconds. */
const formatDurationUs = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const us = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(us) || us <= 0) {
    return '—';
  }
  return `${Math.round(us / 1000).toLocaleString()} ms`;
};

const overviewItems = (alert: ClassicAlertFields) => [
  { title: i18n.ALERT_FLYOUT_FIELD_STATUS, description: asDisplayValue(alert[ALERT_STATUS]) },
  { title: i18n.ALERT_FLYOUT_FIELD_RULE, description: asDisplayValue(alert[ALERT_RULE_NAME]) },
  { title: i18n.ALERT_FLYOUT_FIELD_REASON, description: asDisplayValue(alert[ALERT_REASON]) },
  { title: i18n.ALERT_FLYOUT_FIELD_STARTED, description: asDisplayValue(alert[ALERT_START]) },
  { title: i18n.ALERT_FLYOUT_FIELD_DURATION, description: formatDurationUs(alert[ALERT_DURATION]) },
  { title: i18n.ALERT_FLYOUT_FIELD_TAGS, description: asDisplayValue(alert[ALERT_RULE_TAGS]) },
];

/**
 * A classic alert's fields in a flyout, so a subject opens next to the investigation instead of
 * navigating away. Alerting v2 episodes use the shared episode flyout instead.
 */
export const ClassicAlertDetailsFlyout = ({
  alertId,
  detailsHref,
  onClose,
  services,
}: ClassicAlertDetailsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'subjectAlertDetailsFlyout' });
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');

  const {
    data: alert,
    isLoading,
    isError,
  } = useQuery({
    queryKey: classicAlertQueryKeys.alert(alertId),
    queryFn: ({ signal }) =>
      fetchClassicAlertById({
        ruleTypeIds: CLASSIC_ALERT_RULE_TYPE_IDS,
        id: alertId,
        services,
        abortSignal: signal,
      }),
    enabled: Boolean(alertId),
  });

  const title = useMemo(
    () => (alert ? asDisplayValue(alert[ALERT_RULE_NAME]) : i18n.ALERT_FLYOUT_TITLE),
    [alert]
  );

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={flyoutTitleId}
      size="m"
      data-test-subj="investigationSubjectAlertFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={flyoutTitleId} data-test-subj="investigationSubjectAlertFlyoutTitle">
            {title}
          </h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiTabs bottomBorder={false}>
          <EuiTab
            isSelected={selectedTabId === 'overview'}
            onClick={() => setSelectedTabId('overview')}
          >
            {i18n.ALERT_FLYOUT_OVERVIEW_TAB}
          </EuiTab>
          <EuiTab
            isSelected={selectedTabId === 'fields'}
            onClick={() => setSelectedTabId('fields')}
          >
            {i18n.ALERT_FLYOUT_FIELDS_TAB}
          </EuiTab>
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isLoading && (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="l" aria-label={i18n.ALERT_FLYOUT_LOADING} />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        {!isLoading && (isError || !alert) && (
          <EuiEmptyPrompt
            iconType="warning"
            color="danger"
            title={<h3>{i18n.ALERT_FLYOUT_ERROR_TITLE}</h3>}
            body={<p>{i18n.ALERT_FLYOUT_ERROR_BODY}</p>}
            data-test-subj="investigationSubjectAlertFlyoutError"
          />
        )}
        {!isLoading &&
          alert &&
          (selectedTabId === 'overview' ? (
            <EuiDescriptionList
              type="column"
              columnWidths={[1, 3]}
              listItems={overviewItems(alert)}
              data-test-subj="investigationSubjectAlertFlyoutOverview"
            />
          ) : (
            <AlertFieldsTable alert={alert as unknown as Alert} />
          ))}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              {i18n.ALERT_FLYOUT_CLOSE}
            </EuiButtonEmpty>
          </EuiFlexItem>
          {detailsHref !== undefined && (
            <EuiFlexItem grow={false}>
              <EuiButton
                href={detailsHref}
                iconType="external"
                iconSide="right"
                data-test-subj="investigationSubjectAlertFlyoutViewDetails"
              >
                {i18n.ALERT_FLYOUT_VIEW_DETAILS}
              </EuiButton>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
