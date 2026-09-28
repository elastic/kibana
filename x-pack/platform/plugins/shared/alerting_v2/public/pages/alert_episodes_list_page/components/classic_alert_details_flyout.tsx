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
import { fetchClassicAlertById } from '@kbn/alerting-v2-episodes-ui/classic_alerts/apis/fetch_classic_alert_by_id';
import type { ClassicAlertFields } from '@kbn/alerting-v2-episodes-ui/classic_alerts/types';
import { classicAlertQueryKeys } from '@kbn/alerting-v2-episodes-ui/classic_alerts/query_keys';
import { CLASSIC_ALERT_RULE_TYPE_IDS } from '../../../episode_sources';
import * as i18n from '../translations';

/**
 * Bridges ClassicAlertFields (Record<string, unknown>) to the Alert type that
 * AlertFieldsTable expects. The component only iterates Object.entries, so
 * the shapes are compatible at runtime; the cast is needed because Alert
 * types known fields as JsonValue[] (the ES fields-API convention) while
 * _source returns plain values.
 */
type AlertFieldsTableAlert = React.ComponentProps<typeof AlertFieldsTable>['alert'];
const toAlertFieldsTableAlert = (fields: ClassicAlertFields): AlertFieldsTableAlert =>
  fields as unknown as AlertFieldsTableAlert;

type TabId = 'overview' | 'fields';

export interface ClassicAlertDetailsFlyoutProps {
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
  alert: ClassicAlertFields,
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
    return joined.length ? joined : '—';
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
 * Classic alert details flyout. Chrome (push size, header/footer/tabs) matches
 * the v2 episode flyout so rows in the unified table feel consistent; content stays
 * classic-alert specific (overview fields + fields table).
 */
export const ClassicAlertDetailsFlyout = ({
  alertId,
  onClose,
  services,
}: ClassicAlertDetailsFlyoutProps) => {
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'classicAlertDetailsFlyout' });
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');

  const {
    data: alert,
    isLoading,
    isError,
  } = useQuery<ClassicAlertFields, Error>({
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

  const title = useMemo(() => {
    const fetchedName = alert ? asDisplayValue(alert[ALERT_RULE_NAME]) : undefined;
    return (
      (fetchedName && fetchedName !== '—' ? fetchedName : null) ?? i18n.CLASSIC_ALERT_DETAILS_TITLE
    );
  }, [alert]);

  const overviewItems = useMemo(() => {
    if (!alert) {
      return [];
    }
    return [
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_STATUS,
        description: asDisplayValue(alert[ALERT_STATUS]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_RULE,
        description: asDisplayValue(alert[ALERT_RULE_NAME]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_SEVERITY,
        description: asDisplayValue(alert[ALERT_SEVERITY]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_REASON,
        description: asDisplayValue(alert[ALERT_REASON]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_STARTED,
        description: asDisplayValue(alert[ALERT_START]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_LAST_UPDATED,
        description: asDisplayValue(alert[TIMESTAMP]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_DURATION,
        description: formatDurationUs(alert[ALERT_DURATION]),
      },
      {
        title: i18n.CLASSIC_ALERT_DETAILS_FIELD_TAGS,
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
      data-test-subj="classicAlertEpisodeDetailsFlyout"
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
            <EuiToolTip content={i18n.CLASSIC_ALERT_DETAILS_CLOSE} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                onClick={onClose}
                aria-label={i18n.CLASSIC_ALERT_DETAILS_CLOSE}
                data-test-subj="classicAlertEpisodeDetailsCloseIcon"
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
              <EuiTabs bottomBorder={false} data-test-subj="classicAlertEpisodeDetailsTabs">
                <EuiTab
                  isSelected={selectedTabId === 'overview'}
                  onClick={() => setSelectedTabId('overview')}
                  data-test-subj="classicAlertEpisodeOverviewTab"
                >
                  {i18n.CLASSIC_ALERT_DETAILS_OVERVIEW_TAB}
                </EuiTab>
                <EuiTab
                  isSelected={selectedTabId === 'fields'}
                  onClick={() => setSelectedTabId('fields')}
                  data-test-subj="classicAlertEpisodeFieldsTab"
                >
                  {i18n.CLASSIC_ALERT_DETAILS_FIELDS_TAB}
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
                aria-label={i18n.CLASSIC_ALERT_DETAILS_LOADING}
                data-test-subj="classicAlertEpisodeDetailsLoading"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
      ) : isError || !alert ? (
        <EuiFlyoutBody>
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h3>{i18n.CLASSIC_ALERT_DETAILS_ERROR_TITLE}</h3>}
            body={<p>{i18n.CLASSIC_ALERT_DETAILS_ERROR_BODY}</p>}
            data-test-subj="classicAlertEpisodeDetailsError"
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
              data-test-subj="classicAlertEpisodeOverviewTabPanel"
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
              data-test-subj="classicAlertEpisodeFieldsTabPanel"
            >
              <AlertFieldsTable alert={toAlertFieldsTableAlert(alert)} />
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
                data-test-subj="classicAlertEpisodeDetailsCloseButton"
              >
                {i18n.CLASSIC_ALERT_DETAILS_CLOSE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {alertDetailsHref ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  href={alertDetailsHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  iconType="eye"
                  data-test-subj="classicAlertEpisodeDetailsViewDetailsButton"
                >
                  {i18n.CLASSIC_ALERT_DETAILS_VIEW_DETAILS}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
