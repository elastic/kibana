/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { pagePathGetters } from '@kbn/fleet-plugin/public';
import { INTEGRATIONS_PLUGIN_ID } from '@kbn/fleet-plugin/common';
import { isLeftClickEvent, isModifiedEvent, useKibana } from '../../common/lib/kibana';
import { getPackViewDateWindow } from '../../common/pack_view_date_window';
import { AddToCaseWrapper } from '../../cases/add_to_cases';
import { AddToTimelineButton } from '../../timelines/add_to_timeline_button';
import { ViewResultsInDiscoverAction } from '../../discover/view_results_in_discover';
import { ViewResultsInLensAction } from '../../lens/view_results_in_lens';
import type { AddToTimelineHandler } from '../../types';
import { ViewResultsActionButtonType } from './pack_queries_status_table';

const MORE_ACTIONS_LABEL = i18n.translate(
  'xpack.osquery.queryResultsMoreMenu.moreActionsButtonLabel',
  {
    defaultMessage: 'More actions',
  }
);

const ADD_INTEGRATIONS_LABEL = i18n.translate(
  'xpack.osquery.queryResultsMoreMenu.addIntegrationsLabel',
  { defaultMessage: 'Add integrations' }
);

const FEEDBACK_LABEL = i18n.translate('xpack.osquery.queryResultsMoreMenu.feedbackLabel', {
  defaultMessage: 'Feedback',
});

const DOCUMENTATION_LABEL = i18n.translate(
  'xpack.osquery.queryResultsMoreMenu.documentationLabel',
  { defaultMessage: 'Documentation' }
);

const VIEW_IN_LABEL = i18n.translate('xpack.osquery.queryResultsMoreMenu.viewInLabel', {
  defaultMessage: 'View in',
});

interface QueryResultsMoreMenuProps {
  actionId: string;
  agentIds?: string[];
  queryIds: string[];
  addToTimeline?: AddToTimelineHandler;
  scheduleId?: string;
  executionCount?: number;
  /** Execution time used to bound View in Discover and Lens. */
  timestamp?: string;
}

const QueryResultsMoreMenuComponent: React.FC<QueryResultsMoreMenuProps> = ({
  actionId,
  agentIds,
  queryIds,
  addToTimeline,
  scheduleId,
  executionCount,
  timestamp,
}) => {
  const {
    application: { capabilities, getUrlForApp, navigateToApp },
    chrome,
    docLinks,
    lens,
  } = useKibana().services;
  const [isOpen, setIsOpen] = useState(false);
  const [docsHref, setDocsHref] = useState<string | undefined>();

  const closePopover = useCallback(() => setIsOpen(false), []);
  const togglePopover = useCallback(() => setIsOpen((open) => !open), []);

  useEffect(() => {
    const subscription = chrome.getHelpExtension$().subscribe((extension) => {
      const documentationLink = extension?.links?.find((link) => link.linkType === 'documentation');
      setDocsHref(documentationLink?.href);
    });

    return () => subscription.unsubscribe();
  }, [chrome]);

  const integrationsPath = pagePathGetters.integrations_all({})[1];
  const integrationsHref = getUrlForApp(INTEGRATIONS_PLUGIN_ID, { path: integrationsPath });

  const openIntegrations = useCallback(
    (event: React.MouseEvent) => {
      if (!isModifiedEvent(event) && isLeftClickEvent(event)) {
        event.preventDefault();
        closePopover();
        navigateToApp(INTEGRATIONS_PLUGIN_ID, { path: integrationsPath });
      }
    },
    [closePopover, integrationsPath, navigateToApp]
  );

  const openFeedback = useCallback(() => {
    closePopover();
    const trigger = document.querySelector<HTMLButtonElement>(
      '[data-test-subj="feedbackTriggerButton"]'
    );
    if (trigger && !trigger.disabled) {
      trigger.click();

      return;
    }

    window.open(docLinks.links.kibana.feedback, '_blank', 'noopener');
  }, [closePopover, docLinks.links.kibana.feedback]);

  const documentationHref =
    docsHref ??
    `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/osquery.html`;

  const canDiscover = !!capabilities.discover_v2?.show;
  const canLens = !!lens?.canUseEditor();
  const canViewIn = canDiscover || canLens;
  const queryActionId = queryIds[0];

  const viewInWindow = useMemo(() => {
    const isScheduled = scheduleId != null && executionCount != null;
    if (isScheduled) {
      return getPackViewDateWindow({
        isScheduled: true,
        timestamp,
        interval: 0,
      });
    }

    if (timestamp) {
      return {
        startDate: timestamp,
        endDate: 'now',
        mode: 'relative' as const,
      };
    }

    return {
      startDate: undefined,
      endDate: undefined,
      mode: undefined,
    };
  }, [executionCount, scheduleId, timestamp]);

  const panels = useMemo(
    () => [
      {
        id: 0,
        items: [
          ...(canViewIn
            ? [
                {
                  key: 'view-in',
                  name: VIEW_IN_LABEL,
                  icon: 'eye' as const,
                  panel: 1,
                  'data-test-subj': 'query-results-view-in',
                },
              ]
            : []),
          {
            key: 'add-to-case',
            renderItem: () => (
              <AddToCaseWrapper
                actionId={actionId}
                agentIds={agentIds}
                scheduleId={scheduleId}
                executionCount={executionCount}
                displayAsMenuItem
                onMenuItemClick={closePopover}
              />
            ),
          },
          {
            key: 'add-to-timeline',
            renderItem: () => (
              <AddToTimelineButton
                field="action_id"
                value={queryIds}
                addToTimeline={addToTimeline}
                displayAsMenuItem
                onMenuItemClick={closePopover}
              />
            ),
          },
          {
            key: 'add-integrations',
            name: ADD_INTEGRATIONS_LABEL,
            icon: 'indexOpen' as const,
            href: integrationsHref,
            onClick: openIntegrations,
            'data-test-subj': 'query-results-add-integrations',
          },
          {
            isSeparator: true as const,
            key: 'separator',
          },
          {
            key: 'feedback',
            name: FEEDBACK_LABEL,
            icon: 'comment' as const,
            onClick: openFeedback,
            'data-test-subj': 'query-results-feedback',
          },
          {
            key: 'documentation',
            name: DOCUMENTATION_LABEL,
            icon: 'documentation' as const,
            href: documentationHref,
            target: '_blank',
            rel: 'noopener',
            onClick: closePopover,
            'data-test-subj': 'query-results-documentation',
          },
        ],
      },
      {
        id: 1,
        title: VIEW_IN_LABEL,
        items: [
          ...(canDiscover
            ? [
                {
                  key: 'view-in-discover',
                  renderItem: () => (
                    <ViewResultsInDiscoverAction
                      actionId={queryActionId}
                      buttonType={ViewResultsActionButtonType.menuItem}
                      startDate={viewInWindow.startDate}
                      endDate={viewInWindow.endDate}
                      mode={viewInWindow.mode}
                      scheduleId={scheduleId}
                      executionCount={executionCount}
                      onMenuItemClick={closePopover}
                    />
                  ),
                },
              ]
            : []),
          ...(canLens
            ? [
                {
                  key: 'view-in-lens',
                  renderItem: () => (
                    <ViewResultsInLensAction
                      actionId={queryActionId}
                      buttonType={ViewResultsActionButtonType.menuItem}
                      startDate={viewInWindow.startDate}
                      endDate={viewInWindow.endDate}
                      mode={viewInWindow.mode}
                      scheduleId={scheduleId}
                      executionCount={executionCount}
                      onMenuItemClick={closePopover}
                    />
                  ),
                },
              ]
            : []),
        ],
      },
    ],
    [
      actionId,
      addToTimeline,
      agentIds,
      canDiscover,
      canLens,
      canViewIn,
      closePopover,
      documentationHref,
      executionCount,
      integrationsHref,
      openFeedback,
      openIntegrations,
      queryActionId,
      queryIds,
      scheduleId,
      viewInWindow.endDate,
      viewInWindow.mode,
      viewInWindow.startDate,
    ]
  );

  const button = (
    <EuiButtonIcon
      iconType="ellipsis"
      color="text"
      size="s"
      aria-label={MORE_ACTIONS_LABEL}
      aria-haspopup="menu"
      aria-expanded={isOpen}
      onClick={togglePopover}
      isSelected={isOpen}
      data-test-subj="query-results-more-actions"
    />
  );

  return (
    <EuiPopover
      button={<EuiToolTip content={MORE_ACTIONS_LABEL}>{button}</EuiToolTip>}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
    >
      <EuiContextMenu key={isOpen ? 'open' : 'closed'} initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};

export const QueryResultsMoreMenu = React.memo(QueryResultsMoreMenuComponent);
