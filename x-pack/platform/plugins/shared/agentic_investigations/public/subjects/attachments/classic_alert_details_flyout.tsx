/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { useQuery } from '@kbn/react-query';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
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

const OVERVIEW_TAB_ID = 'overview';
const FIELDS_TAB_ID = 'fields';

/** Groups this flyout's history entries, the way the alerting v2 episode flyout groups its own. */
const FLYOUT_HISTORY_KEY = Symbol('investigationSubjectAlertDetails');

export interface ClassicAlertDetailsFlyoutProps {
  /** `kibana.alert.uuid`. */
  alertId: string;
  /** The alert's details page; rendered as the footer action when the alert has one. */
  detailsHref?: string;
  onClose: () => void;
  services: { http: HttpStart; application?: ApplicationStart };
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
  { title: i18n.ALERT_FLYOUT_FIELD_RULE, description: asDisplayValue(alert[ALERT_RULE_NAME]) },
  { title: i18n.ALERT_FLYOUT_FIELD_REASON, description: asDisplayValue(alert[ALERT_REASON]) },
  { title: i18n.ALERT_FLYOUT_FIELD_STARTED, description: asDisplayValue(alert[ALERT_START]) },
  { title: i18n.ALERT_FLYOUT_FIELD_DURATION, description: formatDurationUs(alert[ALERT_DURATION]) },
  { title: i18n.ALERT_FLYOUT_FIELD_TAGS, description: asDisplayValue(alert[ALERT_RULE_TAGS]) },
];

/**
 * A classic alert's fields in a flyout, so a subject opens in place of the investigation panel
 * instead of navigating away. Alerting v2 episodes use the shared episode flyout; both render
 * through `FlyoutTemplate` in the same flyout session, so they take the same place and the
 * investigation comes back when the alert closes.
 */
export const ClassicAlertDetailsFlyout = ({
  alertId,
  detailsHref,
  onClose,
  services,
}: ClassicAlertDetailsFlyoutProps) => {
  const [selectedTabId, setSelectedTabId] = useState(OVERVIEW_TAB_ID);

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
  const status = alert ? asDisplayValue(alert[ALERT_STATUS]) : undefined;

  const body = (() => {
    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" aria-label={i18n.ALERT_FLYOUT_LOADING} />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    if (isError || !alert) {
      return (
        <EuiEmptyPrompt
          iconType="warning"
          color="danger"
          title={<h3>{i18n.ALERT_FLYOUT_ERROR_TITLE}</h3>}
          body={<p>{i18n.ALERT_FLYOUT_ERROR_BODY}</p>}
          data-test-subj="investigationSubjectAlertFlyoutError"
        />
      );
    }
    return selectedTabId === OVERVIEW_TAB_ID ? (
      <EuiDescriptionList
        type="column"
        columnWidths={[1, 3]}
        listItems={overviewItems(alert)}
        data-test-subj="investigationSubjectAlertFlyoutOverview"
      />
    ) : (
      <AlertFieldsTable alert={alert as unknown as Alert} />
    );
  })();

  return (
    <FlyoutTemplate
      type="overlay"
      // No mask, so the investigation behind the flyout stays readable, like the episode flyout.
      ownFocus={false}
      resizable
      session="start"
      historyKey={FLYOUT_HISTORY_KEY}
      size="m"
      onClose={onClose}
      flyoutMenuProps={{ title: i18n.ALERT_FLYOUT_TITLE }}
      aria-label={i18n.ALERT_FLYOUT_TITLE}
      data-test-subj="investigationSubjectAlertFlyout"
      tabs={[
        { id: OVERVIEW_TAB_ID, label: i18n.ALERT_FLYOUT_OVERVIEW_TAB },
        { id: FIELDS_TAB_ID, label: i18n.ALERT_FLYOUT_FIELDS_TAB },
      ]}
      selectedTabId={selectedTabId}
      onTabChange={setSelectedTabId}
    >
      <FlyoutTemplate.Header
        title={title}
        titleText={title}
        data-test-subj="investigationSubjectAlertFlyoutTitle"
      >
        {status !== undefined && (
          <FlyoutTemplate.Header.Badge color={status === 'active' ? 'danger' : 'hollow'}>
            {status}
          </FlyoutTemplate.Header.Badge>
        )}
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.TabPanel tabId={selectedTabId}>{body}</FlyoutTemplate.Body.TabPanel>
      </FlyoutTemplate.Body>
      {detailsHref !== undefined && (
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryAction
            label={i18n.ALERT_FLYOUT_VIEW_DETAILS}
            iconType="external"
            iconSide="right"
            onClick={() => {
              // Inside Kibana, so the details page opens without reloading the app.
              void services.application?.navigateToUrl(detailsHref);
            }}
            data-test-subj="investigationSubjectAlertFlyoutViewDetails"
          />
        </FlyoutTemplate.Footer>
      )}
    </FlyoutTemplate>
  );
};
