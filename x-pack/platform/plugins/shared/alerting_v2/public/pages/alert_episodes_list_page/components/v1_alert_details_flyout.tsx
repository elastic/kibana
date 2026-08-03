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
  EuiButtonIcon,
  EuiDescriptionList,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useQuery } from '@kbn/react-query';
import type { HttpStart } from '@kbn/core-http-browser';
import { AlertFieldsTable } from '@kbn/alerts-ui-shared';
import { formatMetadataListDuration } from '@kbn/alerting-v2-episodes-ui/components/details/translations';
import {
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_RULE_NAME,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_SEVERITY,
  ALERT_START,
  ALERT_STATUS,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import {
  fetchV1AlertById,
  type V1AlertFields,
} from '@kbn/alerting-v2-episodes-ui/apis/classic_alerts_api';
import * as i18n from '../translations';

type TabId = 'overview' | 'fields';

export interface V1AlertDetailsFlyoutProps {
  alertId: string;
  onClose: () => void;
  services: { http: HttpStart };
}

/**
 * Observability alert details page path. Only observability rule types have a
 * dedicated details page (stack alerts don't).
 */
const OBS_RULE_TYPE_IDS: ReadonlySet<string> = new Set([
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
]);
const OBSERVABILITY_ALERT_DETAILS_BASE_PATH = '/app/observability/alerts';

/**
 * Rebuilds the observability alert details page href from the classic alert's
 * uuid, but only for observability rule types (detected via the alert's
 * `kibana.alert.rule.rule_type_id`). Returns `null` for stack alerts or any
 * rule type that has no dedicated details page.
 */
const resolveAlertDetailsHref = (
  alertId: string,
  alert: V1AlertFields,
  http: HttpStart
): string | null => {
  const ruleTypeId = Array.isArray(alert[ALERT_RULE_TYPE_ID])
    ? alert[ALERT_RULE_TYPE_ID][0]
    : alert[ALERT_RULE_TYPE_ID];
  if (typeof ruleTypeId !== 'string' || !OBS_RULE_TYPE_IDS.has(ruleTypeId)) {
    return null;
  }
  return http.basePath.prepend(
    `${OBSERVABILITY_ALERT_DETAILS_BASE_PATH}/${encodeURIComponent(alertId)}`
  );
};

const asDisplayValue = (value: unknown): string => {
  if (value == null) {
    return '—';
  }
  if (Array.isArray(value)) {
    const joined = value.filter((entry) => entry != null).join(', ');
    return joined.length ? joined : '-';
  }
  return String(value);
};

const formatDurationUs = (value: unknown): string => {
  const raw = Array.isArray(value) ? value[0] : value;
  const us = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(us) || us <= 0) {
    return '—';
  }
  return formatMetadataListDuration(us / 1000);
};

/**
 * Classic (v1) alert details flyout. Chrome (push size, header/footer/tabs) matches
 * the v2 episode flyout so rows in the unified table feel consistent; content stays
 * classic-alert specific (overview fields + fields table).
 */
export const V1AlertDetailsFlyout = ({ alertId, onClose, services }: V1AlertDetailsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'v1AlertDetailsFlyout' });
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');

  const {
    data: alert,
    isLoading,
    isError,
  } = useQuery<V1AlertFields, Error>({
    queryKey: ['alertingV2', 'classicAlert', alertId],
    queryFn: ({ signal }) => fetchV1AlertById({ id: alertId, services, abortSignal: signal }),
    enabled: Boolean(alertId),
  });

  const title = useMemo(() => {
    const fetchedName = alert ? asDisplayValue(alert[ALERT_RULE_NAME]) : undefined;
    return (
      (fetchedName && fetchedName !== '—' ? fetchedName : null) ?? i18n.EPISODE_V1_DETAILS_TITLE
    );
  }, [alert]);

  const overviewItems = useMemo(() => {
    if (!alert) {
      return [];
    }
    return [
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_STATUS,
        description: asDisplayValue(alert[ALERT_STATUS]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_RULE,
        description: asDisplayValue(alert[ALERT_RULE_NAME]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_SEVERITY,
        description: asDisplayValue(alert[ALERT_SEVERITY]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_REASON,
        description: asDisplayValue(alert[ALERT_REASON]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_STARTED,
        description: asDisplayValue(alert[ALERT_START]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_LAST_UPDATED,
        description: asDisplayValue(alert[TIMESTAMP]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_DURATION,
        description: formatDurationUs(alert[ALERT_DURATION]),
      },
      {
        title: i18n.EPISODE_V1_DETAILS_FIELD_TAGS,
        description: asDisplayValue(alert[ALERT_RULE_TAGS]),
      },
    ];
  }, [alert]);

  const alertDetailsHref = useMemo(
    () => (alert ? resolveAlertDetailsHref(alertId, alert, services.http) : null),
    [alert, alertId, services.http]
  );

  return (
    <EuiFlyout
      type="push"
      hasAnimation
      hideCloseButton
      onClose={onClose}
      pushMinBreakpoint="m"
      paddingSize="none"
      size="35%"
      aria-labelledby={flyoutTitleId}
      data-test-subj="alertEpisodeV1DetailsFlyout"
    >
      <EuiPanel
        paddingSize="xs"
        hasShadow={false}
        hasBorder={false}
        borderRadius="none"
        color="transparent"
      >
        <EuiFlexGroup
          justifyContent="flexEnd"
          gutterSize="s"
          responsive={false}
          alignItems="center"
        >
          <EuiFlexItem grow={false}>
            <EuiToolTip content={i18n.EPISODE_V1_DETAILS_CLOSE} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onClose}
                aria-label={i18n.EPISODE_V1_DETAILS_CLOSE}
                data-test-subj="alertEpisodeV1DetailsCloseIcon"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiFlyoutHeader hasBorder>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
          css={css`
            padding-block-end: 0;
          `}
        >
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{title}</h2>
          </EuiTitle>
          {!isLoading && !isError && alert ? (
            <>
              <EuiSpacer size="s" />
              <EuiTabs bottomBorder={false} data-test-subj="alertEpisodeV1DetailsTabs">
                <EuiTab
                  isSelected={selectedTabId === 'overview'}
                  onClick={() => setSelectedTabId('overview')}
                  data-test-subj="alertEpisodeV1OverviewTab"
                >
                  {i18n.EPISODE_V1_DETAILS_OVERVIEW_TAB}
                </EuiTab>
                <EuiTab
                  isSelected={selectedTabId === 'fields'}
                  onClick={() => setSelectedTabId('fields')}
                  data-test-subj="alertEpisodeV1FieldsTab"
                >
                  {i18n.EPISODE_V1_DETAILS_FIELDS_TAB}
                </EuiTab>
              </EuiTabs>
            </>
          ) : null}
        </EuiPanel>
      </EuiFlyoutHeader>
      {isLoading ? (
        <EuiFlyoutBody>
          <EuiFlexGroup alignItems="center" justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="xl"
                aria-label={i18n.EPISODE_V1_DETAILS_LOADING}
                data-test-subj="alertEpisodeV1DetailsLoading"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : isError || !alert ? (
        <EuiFlyoutBody>
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h3>{i18n.EPISODE_V1_DETAILS_ERROR_TITLE}</h3>}
            body={<p>{i18n.EPISODE_V1_DETAILS_ERROR_BODY}</p>}
            data-test-subj="alertEpisodeV1DetailsError"
          />
        </EuiFlyoutBody>
      ) : (
        <EuiFlyoutBody
          css={
            selectedTabId === 'fields'
              ? css`
                  [class*='euiFlyoutBody__overflowContent'] {
                    padding: 0;
                  }
                `
              : undefined
          }
        >
          {selectedTabId === 'overview' ? (
            <EuiPanel
              hasShadow={false}
              hasBorder={false}
              paddingSize="m"
              color="transparent"
              data-test-subj="alertEpisodeV1OverviewTabPanel"
            >
              <EuiDescriptionList
                listItems={overviewItems}
                type="column"
                columnWidths={[1, 3]}
                compressed
              />
            </EuiPanel>
          ) : (
            <EuiPanel
              hasShadow={false}
              hasBorder={false}
              paddingSize="m"
              color="transparent"
              data-test-subj="alertEpisodeV1FieldsTabPanel"
            >
              <AlertFieldsTable
                alert={alert as unknown as React.ComponentProps<typeof AlertFieldsTable>['alert']}
              />
            </EuiPanel>
          )}
        </EuiFlyoutBody>
      )}
      <EuiFlyoutFooter>
        <EuiPanel
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          borderRadius="none"
          color="transparent"
        >
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={onClose}
                flush="left"
                data-test-subj="alertEpisodeV1DetailsCloseButton"
              >
                {i18n.EPISODE_V1_DETAILS_CLOSE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {alertDetailsHref ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  href={alertDetailsHref}
                  target="_blank"
                  iconType="eye"
                  data-test-subj="alertEpisodeV1DetailsViewDetailsButton"
                >
                  {i18n.EPISODE_V1_DETAILS_VIEW_DETAILS}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
