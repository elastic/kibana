/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiDescriptionList, EuiEmptyPrompt } from '@elastic/eui';
import { useQuery } from '@kbn/react-query';
import { FlyoutTemplate, type FlyoutTabBarProps, type FlyoutTabProps } from '@kbn/flyout-template';
import type { HttpStart } from '@kbn/core-http-browser';
import { AlertFieldsTable } from '@kbn/alerts-ui-shared';
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
import { FLYOUT_TAKE_ACTION, formatMetadataListDuration } from './details/translations';
import { buildEpisodeMenuPanels } from './details/build_episode_menu_panels';
import { AlertEpisodeDescriptionListSkeleton } from './details/section_skeletons';
import { useAlertDetailsFlyoutWidth } from './details/use_alert_details_flyout_width';
import { CLASSIC_SOURCE_LABEL, ELASTIC_SOURCE_ICON } from '../source_labels';
import type { EpisodeAction } from '../actions';
import { mapClassicAlertToEpisode } from '../classic_alerts/utils/map_alert';
import type { ClassicAlertSource } from '../classic_alerts/utils/map_alert';
import {
  CLASSIC_EPISODE_SOURCE_ID,
  CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS,
} from '../classic_alerts/constants';
import { fetchClassicAlertById } from '../classic_alerts/apis/fetch_classic_alert_by_id';
import { enrichClassicEpisodesWithSnoozeState } from '../classic_alerts/apis/fetch_classic_episodes';
import type { ClassicAlertFields } from '../classic_alerts/types';
import { classicAlertQueryKeys } from '../classic_alerts/query_keys';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import * as i18n from './translations';

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

const TABS: FlyoutTabProps[] = [
  {
    id: 'overview',
    label: i18n.CLASSIC_ALERT_DETAILS_OVERVIEW_TAB,
    'data-test-subj': 'classicAlertEpisodeOverviewTab',
  },
  {
    id: 'fields',
    label: i18n.CLASSIC_ALERT_DETAILS_FIELDS_TAB,
    'data-test-subj': 'classicAlertEpisodeFieldsTab',
  },
];

const TAB_BAR_PROPS: FlyoutTabBarProps = { 'data-test-subj': 'classicAlertEpisodeDetailsTabs' };

/** Matches the Overview tab's field count, so the skeleton has the shape of the loaded list. */
const OVERVIEW_ROW_COUNT = 8;

export interface ClassicAlertDetailsFlyoutProps {
  alertId: string;
  onClose: () => void;
  services: { http: HttpStart };
  actions?: EpisodeAction[];
  onSuccess?: () => void;
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
 * Classic alert details flyout. Built on `FlyoutTemplate` like the v2 episode flyout, so rows in
 * the unified table open with the same chrome; content stays classic-alert specific (overview
 * fields + fields table).
 */
export const ClassicAlertDetailsFlyout = ({
  alertId,
  onClose,
  services,
  actions,
  onSuccess,
}: ClassicAlertDetailsFlyoutProps) => {
  const [selectedTabId, setSelectedTabId] = useState<TabId>('overview');
  const initialWidth = useAlertDetailsFlyoutWidth();
  const ruleTypeIds =
    useAdditionalEpisodesDataSource()?.ruleTypeIds ?? CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS;

  const { data, isLoading, isError } = useQuery({
    queryKey: classicAlertQueryKeys.alert(alertId),
    queryFn: async ({ signal }) => {
      const fetched = await fetchClassicAlertById({
        ruleTypeIds,
        id: alertId,
        services,
        abortSignal: signal,
      });
      const mapped = {
        ...mapClassicAlertToEpisode(
          fetched as unknown as ClassicAlertSource,
          typeof fetched._index === 'string' ? fetched._index : ''
        ),
        source_id: CLASSIC_EPISODE_SOURCE_ID,
      };
      // The alert document does not store snooze state. Apply the same enrichment as the table.
      const [episode] = await enrichClassicEpisodesWithSnoozeState([mapped], services.http, signal);
      return { alert: fetched, episode };
    },
    enabled: Boolean(alertId),
  });

  const alert = data?.alert;
  // A failed refetch keeps the previous data, so `alert` alone does not mean it loaded. Only
  // loaded data feeds the tabs and the actions; the title may keep the last known rule name.
  const isLoaded = !isLoading && !isError;
  const loadedAlert = isLoaded ? alert : undefined;
  const loadedEpisode = isLoaded ? data?.episode : undefined;
  const episodes = useMemo(() => (loadedEpisode ? [loadedEpisode] : []), [loadedEpisode]);
  // Keep actions the table shows while disabled, such as Unresolve on a resolved classic alert.
  const menuActions = useMemo(
    () =>
      actions && episodes.length
        ? actions.filter(
            (action) =>
              action.isCompatible({ episodes }) || Boolean(action.showWhenDisabled?.({ episodes }))
          )
        : [],
    [actions, episodes]
  );

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
    () => (loadedAlert ? resolveAlertDetailsHref(alertId, loadedAlert, services.http) : null),
    [loadedAlert, alertId, services.http]
  );

  const takeActionPanels = useMemo(
    () =>
      buildEpisodeMenuPanels({
        actions: menuActions,
        episodes,
        viewDetailsHref: alertDetailsHref,
        onSuccess,
      }),
    [menuActions, episodes, alertDetailsHref, onSuccess]
  );

  return (
    <FlyoutTemplate
      type="overlay"
      ownFocus={false}
      resizable
      // The header title starts as a fallback and becomes the rule name, which would make the
      // flyout reopen on first load. A constant menu title keeps its registration stable.
      flyoutMenuProps={{ title: i18n.CLASSIC_ALERT_DETAILS_TITLE }}
      size={initialWidth}
      onClose={onClose}
      data-test-subj="classicAlertEpisodeDetailsFlyout"
      tabs={loadedAlert ? TABS : undefined}
      tabBarProps={TAB_BAR_PROPS}
      selectedTabId={selectedTabId}
      onTabChange={(tabId) => setSelectedTabId(tabId as TabId)}
    >
      <FlyoutTemplate.Header title={title} isLoading={isLoading}>
        <FlyoutTemplate.Header.Badge
          color="hollow"
          iconType={ELASTIC_SOURCE_ICON}
          data-test-subj="classicAlertEpisodeSourceBadge"
        >
          {CLASSIC_SOURCE_LABEL}
        </FlyoutTemplate.Header.Badge>
      </FlyoutTemplate.Header>

      <FlyoutTemplate.Body>
        {isLoading ? (
          // The skeleton has no accessible name of its own, so the wrapper announces what loads.
          <div
            role="progressbar"
            aria-label={i18n.CLASSIC_ALERT_DETAILS_LOADING}
            data-test-subj="classicAlertEpisodeDetailsLoading"
          >
            <AlertEpisodeDescriptionListSkeleton rows={OVERVIEW_ROW_COUNT} />
          </div>
        ) : !loadedAlert ? (
          <EuiEmptyPrompt
            iconType="alert"
            color="danger"
            title={<h3>{i18n.CLASSIC_ALERT_DETAILS_ERROR_TITLE}</h3>}
            body={<p>{i18n.CLASSIC_ALERT_DETAILS_ERROR_BODY}</p>}
            data-test-subj="classicAlertEpisodeDetailsError"
          />
        ) : (
          <>
            <FlyoutTemplate.Body.TabPanel
              tabId="overview"
              data-test-subj="classicAlertEpisodeOverviewTabPanel"
            >
              <EuiDescriptionList
                listItems={overviewItems}
                type="column"
                columnWidths={[1, 3]}
                compressed
              />
            </FlyoutTemplate.Body.TabPanel>
            <FlyoutTemplate.Body.TabPanel
              tabId="fields"
              data-test-subj="classicAlertEpisodeFieldsTabPanel"
            >
              <AlertFieldsTable alert={toAlertFieldsTableAlert(loadedAlert)} />
            </FlyoutTemplate.Body.TabPanel>
          </>
        )}
      </FlyoutTemplate.Body>

      <FlyoutTemplate.Footer>
        <FlyoutTemplate.Footer.SecondaryAction
          label={i18n.CLASSIC_ALERT_DETAILS_CLOSE}
          onClick={onClose}
          data-test-subj="classicAlertEpisodeDetailsCloseButton"
        />
        <FlyoutTemplate.Footer.PrimaryActionMenu
          label={FLYOUT_TAKE_ACTION}
          aria-label={FLYOUT_TAKE_ACTION}
          panels={takeActionPanels}
          data-test-subj="alertingV2EpisodeFlyoutTakeActionButton"
        />
      </FlyoutTemplate.Footer>
    </FlyoutTemplate>
  );
};
