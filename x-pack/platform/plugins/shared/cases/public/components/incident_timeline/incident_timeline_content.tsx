/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSkeletonRectangle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useMutation } from '@kbn/react-query';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { IncidentTimelineAlert } from '../../../common/types/api';
import type { IncidentTimelineEntryData } from '../../../common/types/domain/attachment/incident_timeline_entry/v2';
import type { CaseUI } from '../../../common/ui/types';
import { useKibana } from '../../common/lib/kibana';
import { useCasesToast } from '../../common/use_cases_toast';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { useDeleteComment } from '../../containers/use_delete_comment';
import type { ServerError } from '../../types';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useRefreshCaseViewPage } from '../case_view/use_on_refresh_case_view_page';
import { DeleteAttachmentConfirmationModal } from '../user_actions/delete_attachment_confirmation_modal';
import { updateIncidentTimelineEntry } from './api';
import { EntryFlyout } from './entry_flyout';
import { useIncidentTimelineFocus } from './focus_context';
import { formatRange, useTimeFormat } from './format';
import type { AlertCell, TimeWindow, TimelineEntry, TimelineSelection } from './model';
import {
  buildDiscoverParams,
  buildTimelineEvents,
  buildTimelineModel,
  parseTimelineEntries,
} from './model';
import { ElasticChartsRenderer } from './renderer/elastic_charts_renderer';
import { SelectionBar } from './selection_bar';
import { TimelineTable } from './timeline_table';
import { useCaseStatusChanges, useIncidentTimelineAlerts } from './use_incident_timeline_data';
import * as i18n from './translations';

type FlyoutState =
  | { readonly mode: 'add'; readonly initial: Partial<IncidentTimelineEntryData> }
  | { readonly mode: 'edit'; readonly entry: TimelineEntry };

const EMPTY_ALERTS: readonly IncidentTimelineAlert[] = [];

type TimelineView = 'chart' | 'table';

const VIEW_OPTIONS: Array<{ id: TimelineView; label: string }> = [
  { id: 'chart', label: i18n.VIEW_CHART },
  { id: 'table', label: i18n.VIEW_TABLE },
];

export interface IncidentTimelineContentProps {
  caseData: CaseUI;
}

export const IncidentTimelineContent: React.FC<IncidentTimelineContentProps> = ({ caseData }) => {
  const { permissions, features } = useCasesContext();
  // The host's alerts gate (Security: RBAC plus index read), the one the Alerts view uses.
  const canReadAlerts = features.alerts.read;
  const { share } = useKibana().services;
  const timeFormat = useTimeFormat();
  const { showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();

  const alertsQuery = useIncidentTimelineAlerts(caseData.id, canReadAlerts);
  const statusQuery = useCaseStatusChanges(caseData.id);
  const [nowMs] = useState(() => Date.now());
  const [zoom, setZoom] = useState<TimeWindow | undefined>();
  const [showAllRules, setShowAllRules] = useState(false);
  const [selection, setSelection] = useState<TimelineSelection | undefined>();
  const [flyout, setFlyout] = useState<FlyoutState | undefined>();
  const [pendingDelete, setPendingDelete] = useState<TimelineEntry | undefined>();
  const [view, setView] = useState<TimelineView>('chart');

  const alerts = alertsQuery.data?.alerts ?? EMPTY_ALERTS;
  const entries = useMemo(() => parseTimelineEntries(caseData.comments), [caseData.comments]);
  const model = useMemo(
    () =>
      buildTimelineModel({
        createdAtMs: Date.parse(caseData.createdAt),
        createdBy: caseData.createdBy.fullName || caseData.createdBy.username || '',
        closedAtMs: caseData.closedAt ? Date.parse(caseData.closedAt) : undefined,
        statusChanges: statusQuery.data ?? [],
        alerts,
        entries,
        nowMs,
        showAllRules,
      }),
    [caseData, statusQuery.data, alerts, entries, nowMs, showAllRules]
  );
  const window = zoom ?? model.window;
  const events = useMemo(
    () =>
      view === 'table'
        ? buildTimelineEvents({ markers: model.caseLane.markers, entries, alerts })
        : [],
    [view, model.caseLane.markers, entries, alerts]
  );

  const focus = useIncidentTimelineFocus();
  useEffect(() => {
    if (!focus?.request) return;
    const { entryId, intent } = focus.request;
    const entry = entries.find(({ id }) => id === entryId);
    if (entry) {
      setZoom(undefined);
      setSelection({ kind: 'entry', entry });
      if (intent === 'edit') setFlyout({ mode: 'edit', entry });
    }
    focus.clearRequest();
  }, [focus, entries]);
  const alertsById = useMemo(
    () => (alertsQuery.data ? new Map(alerts.map((alert) => [alert.id, alert])) : undefined),
    [alertsQuery.data, alerts]
  );

  const discoverLocator = share?.url.locators.get(DISCOVER_APP_LOCATOR);
  const discoverParams = useMemo(
    () =>
      buildDiscoverParams({
        caseId: caseData.id,
        caseTitle: caseData.title,
        alerts,
        dataViewName: i18n.DATA_VIEW_NAME,
      }),
    [caseData.id, caseData.title, alerts]
  );

  const onAlertClick = useCallback(
    (alert: IncidentTimelineAlert, ruleName: string) =>
      setSelection({ kind: 'alert', alert, ruleName }),
    []
  );
  const onEntryClick = useCallback(
    (entry: TimelineEntry) => setSelection({ kind: 'entry', entry }),
    []
  );
  const onCellClick = useCallback(
    (cell: AlertCell) => setZoom({ startMs: cell.startMs, endMs: cell.endMs }),
    []
  );

  const { mutate: createAttachments, isLoading: isCreating } = useCreateAttachments();
  const { mutate: deleteEntry } = useDeleteComment();
  const { mutate: updateEntry, isLoading: isUpdating } = useMutation(updateIncidentTimelineEntry, {
    onSuccess: () => refreshCaseViewPage(),
    onError: (error: ServerError) => showErrorToast(error),
  });

  const onSubmitEntry = (data: IncidentTimelineEntryData) => {
    if (flyout?.mode === 'edit') {
      updateEntry(
        {
          caseId: caseData.id,
          entryId: flyout.entry.id,
          version: flyout.entry.version,
          owner: caseData.owner,
          data,
        },
        { onSuccess: () => setFlyout(undefined) }
      );
      setSelection(undefined);
      return;
    }
    createAttachments(
      {
        caseId: caseData.id,
        caseOwner: caseData.owner,
        attachments: [{ type: INCIDENT_TIMELINE_ENTRY_ATTACHMENT_TYPE, data }],
      },
      {
        onSuccess: () => {
          setFlyout(undefined);
          setSelection(undefined);
          refreshCaseViewPage();
        },
      }
    );
  };

  const markAsSignificant = useCallback((alert: IncidentTimelineAlert, ruleName: string) => {
    setSelection({ kind: 'alert', alert, ruleName });
    setFlyout({
      mode: 'add',
      initial: {
        title: ruleName,
        occurredAt: alert.time,
        alert: { id: alert.id, index: alert.index },
      },
    });
  }, []);

  const onEditEntry = useCallback((entry: TimelineEntry) => setFlyout({ mode: 'edit', entry }), []);

  const onDeleteEntry = useCallback((entry: TimelineEntry) => setPendingDelete(entry), []);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteEntry({
      caseId: caseData.id,
      commentId: pendingDelete.id,
      successToasterTitle: i18n.ENTRY_DELETED,
    });
    setPendingDelete(undefined);
    setSelection(undefined);
  };

  const alertsPlaceholder = (() => {
    if (!canReadAlerts) {
      return (
        <EuiText size="s" data-test-subj="incident-timeline-alerts-no-privileges">
          <strong>{i18n.ALERTS_PRIVILEGES_TITLE}</strong>
          <p>{i18n.ALERTS_PRIVILEGES_BODY}</p>
        </EuiText>
      );
    }
    if (alertsQuery.isLoading) {
      return (
        <EuiFlexGroup
          direction="column"
          gutterSize="xs"
          data-test-subj="incident-timeline-alerts-loading"
        >
          {[0, 1, 2].map((i) => (
            <EuiSkeletonRectangle key={i} width="100%" height={20} />
          ))}
        </EuiFlexGroup>
      );
    }
    if (alertsQuery.isError) {
      const isForbidden = alertsQuery.error?.body?.statusCode === 403;
      return (
        <EuiCallOut
          announceOnMount
          size="s"
          color={isForbidden ? 'warning' : 'danger'}
          iconType="warning"
          title={isForbidden ? i18n.ALERTS_PRIVILEGES_TITLE : i18n.ALERTS_ERROR}
          text={isForbidden ? i18n.ALERTS_PRIVILEGES_BODY : undefined}
          data-test-subj="incident-timeline-alerts-error"
          actionProps={
            isForbidden
              ? undefined
              : { primary: { children: i18n.RETRY, onClick: () => alertsQuery.refetch() } }
          }
        />
      );
    }
    if (alerts.length === 0) {
      return (
        <EuiText size="s" color="subdued" data-test-subj="incident-timeline-no-alerts">
          {i18n.NO_ALERTS}
        </EuiText>
      );
    }
    return undefined;
  })();

  const notes = alertsQuery.data
    ? [
        alertsQuery.data.notFound > 0 ? i18n.NOT_FOUND(alertsQuery.data.notFound) : undefined,
        alertsQuery.data.remote > 0 ? i18n.REMOTE(alertsQuery.data.remote) : undefined,
        alertsQuery.data.atLimit ? i18n.AT_LIMIT : undefined,
      ].filter((note): note is string => note !== undefined)
    : [];

  const discoverDisabledReason = (() => {
    if (!discoverLocator) return i18n.DISCOVER_UNAVAILABLE;
    if (!canReadAlerts) return i18n.ALERTS_PRIVILEGES_BODY;
    if (!discoverParams) return i18n.NO_ALERTS;
    return undefined;
  })();
  // The lane plots attachment ids; Discover queries kibana.alert.case_ids, and the two can drift.
  const discoverTooltip = discoverDisabledReason ?? i18n.DISCOVER_COUNT_MAY_DIFFER(alerts.length);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.VIEW_LEGEND}
            options={VIEW_OPTIONS}
            idSelected={view}
            onChange={(id) => setView(id === 'table' ? 'table' : 'chart')}
            buttonSize="compressed"
            data-test-subj="incident-timeline-view"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued" data-test-subj="incident-timeline-window">
            {formatRange(window.startMs, window.endMs, timeFormat)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="magnifyMinus"
            isDisabled={zoom === undefined || view === 'table'}
            onClick={() => setZoom(undefined)}
            data-test-subj="incident-timeline-reset-zoom"
          >
            {i18n.RESET_ZOOM}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {permissions.createComment && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              onClick={() => setFlyout({ mode: 'add', initial: {} })}
              data-test-subj="incident-timeline-add-entry"
            >
              {i18n.ADD_ENTRY}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiToolTip content={discoverTooltip}>
            <EuiButtonEmpty
              size="s"
              iconType="discoverApp"
              isDisabled={discoverDisabledReason !== undefined}
              onClick={() => {
                if (discoverLocator && discoverParams) discoverLocator.navigate(discoverParams);
              }}
              data-test-subj="incident-timeline-open-discover"
            >
              {i18n.OPEN_IN_DISCOVER}
            </EuiButtonEmpty>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {view === 'table' ? (
        <>
          {alertsPlaceholder}
          <TimelineTable
            events={events}
            canCreate={permissions.createComment}
            canUpdate={permissions.update}
            canDelete={permissions.delete}
            onMarkAsSignificant={markAsSignificant}
            onEditEntry={onEditEntry}
            onDeleteEntry={onDeleteEntry}
          />
        </>
      ) : (
        <ElasticChartsRenderer
          model={model}
          window={window}
          selection={selection}
          alertsPlaceholder={alertsPlaceholder}
          onBrush={setZoom}
          onAlertClick={onAlertClick}
          onCellClick={onCellClick}
          onEntryClick={onEntryClick}
        />
      )}
      {view === 'chart' &&
        (model.hiddenRuleCount > 0 || showAllRules) &&
        alertsPlaceholder === undefined && (
          <EuiButtonEmpty
            size="xs"
            onClick={() => setShowAllRules((value) => !value)}
            data-test-subj="incident-timeline-toggle-rules"
          >
            {showAllRules ? i18n.SHOW_FEWER_RULES : i18n.SHOW_MORE_RULES(model.hiddenRuleCount)}
          </EuiButtonEmpty>
        )}
      {notes.map((note) => (
        <EuiText
          key={note}
          size="xs"
          color="subdued"
          data-test-subj="incident-timeline-alerts-note"
        >
          {note}
        </EuiText>
      ))}
      {view === 'chart' && selection && (
        <>
          <EuiSpacer size="s" />
          <SelectionBar
            selection={selection}
            alertsById={alertsById}
            canCreate={permissions.createComment}
            canUpdate={permissions.update}
            canDelete={permissions.delete}
            onMarkAsSignificant={() =>
              selection.kind === 'alert' && markAsSignificant(selection.alert, selection.ruleName)
            }
            onEdit={() => selection.kind === 'entry' && onEditEntry(selection.entry)}
            onDelete={() => selection.kind === 'entry' && onDeleteEntry(selection.entry)}
            onClear={() => setSelection(undefined)}
          />
        </>
      )}
      {pendingDelete && (
        <DeleteAttachmentConfirmationModal
          title={i18n.DELETE_ENTRY_TITLE(pendingDelete.data.title)}
          confirmButtonText={i18n.DELETE}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(undefined)}
        />
      )}
      {flyout && (
        <EntryFlyout
          initial={flyout.mode === 'edit' ? flyout.entry.data : flyout.initial}
          isEdit={flyout.mode === 'edit'}
          isSubmitting={isCreating || isUpdating}
          onSubmit={onSubmitEntry}
          onClose={() => setFlyout(undefined)}
        />
      )}
    </>
  );
};

IncidentTimelineContent.displayName = 'IncidentTimelineContent';
