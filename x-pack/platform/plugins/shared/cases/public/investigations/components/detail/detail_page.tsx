/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { EuiButton, EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import {
  getHttpErrorStatus,
  useInvestigationBreadcrumbs,
  useInvestigationsNavigation,
  useLivePolling,
  useRecord,
} from '../../hooks';
import { ICONS } from '../../icons';
import { ErrorState } from '../shared/error_state';
import { LoadingState } from '../shared/loading_state';
import type { ModalName } from '../modals/modal_props';
import { ActivityTab } from '../tabs/activity_tab';
import { ConversationTab } from '../tabs/conversation_tab';
import { EvidenceTab } from '../tabs/evidence_tab';
import { OverviewTab } from '../tabs/overview_tab';
import { ProcedureTab } from '../tabs/procedure_tab';
import { ScopeTab } from '../tabs/scope_tab';
import { isTabId } from '../tabs/tab_props';
import type { TabId, TabProps } from '../tabs/tab_props';
import { DetailHeader } from './detail_header';
import { ModalHost } from './modal_host';
import { SidePanel } from './side_panel';
import type { SidePanelMode } from './side_panel';
import { TabsBar } from './tabs_bar';
import { useSidePanelOpen } from './use_side_panel_open';
import * as i18n from './translations';

const SIDE_PANEL_WIDTH = '360px';

const TAB_COMPONENTS: Record<TabId, React.FC<TabProps>> = {
  overview: OverviewTab,
  conversation: ConversationTab,
  evidence: EvidenceTab,
  scope: ScopeTab,
  procedure: ProcedureTab,
  activity: ActivityTab,
};

const pageStyles = css`
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
`;

const PageMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        padding: ${euiTheme.size.xxl};
      `}
    >
      {children}
    </div>
  );
};
PageMessage.displayName = 'PageMessage';

const NotFound: React.FC<{ title: string; body: string; testSubj: string }> = ({
  title,
  body,
  testSubj,
}) => {
  const { goToQueue } = useInvestigationsNavigation();

  return (
    <PageMessage>
      <EuiEmptyPrompt
        iconType={ICONS.investigation}
        titleSize="s"
        title={<h2>{title}</h2>}
        body={<p>{body}</p>}
        actions={
          <EuiButton fill onClick={goToQueue} data-test-subj="investigationBackToQueue">
            {i18n.BACK_TO_QUEUE}
          </EuiButton>
        }
        data-test-subj={testSubj}
      />
    </PageMessage>
  );
};
NotFound.displayName = 'NotFound';

export const DetailPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const { search } = useLocation();
  const { data, isLoading, error, refetch } = useRecord(id);
  const [openModal, setOpenModal] = useState<ModalName | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useSidePanelOpen();
  const [sidePanelMode, setSidePanelMode] = useState<SidePanelMode>('context');

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const requestedTab = searchParams.get('tab');
  const activeTab: TabId = isTabId(requestedTab) ? requestedTab : 'overview';
  const openItemId = searchParams.get('item') ?? undefined;

  useInvestigationBreadcrumbs(data?.record.display_id);
  useLivePolling(id);

  const navigateTab = useCallback(
    (tab: TabId, opts?: { itemId?: string }) => {
      const params = new URLSearchParams();
      if (tab !== 'overview') {
        params.set('tab', tab);
      }
      if (opts?.itemId) {
        params.set('item', opts.itemId);
      }
      const query = params.toString();
      history.push({ pathname: history.location.pathname, search: query ? `?${query}` : '' });
    },
    [history]
  );

  if (isLoading) {
    return (
      <PageMessage>
        <LoadingState label={i18n.LOADING_INVESTIGATION} />
      </PageMessage>
    );
  }

  if (error || !data) {
    const status = getHttpErrorStatus(error);
    if (status === 404) {
      return (
        <NotFound
          title={i18n.NOT_FOUND_TITLE}
          body={i18n.NOT_FOUND_BODY}
          testSubj="investigationNotFound"
        />
      );
    }
    if (status === 403) {
      return (
        <NotFound
          title={i18n.FORBIDDEN_TITLE}
          body={i18n.FORBIDDEN_BODY}
          testSubj="investigationForbidden"
        />
      );
    }
    return (
      <PageMessage>
        <ErrorState title={i18n.LOAD_ERROR_TITLE} error={error} onRetry={() => void refetch()} />
      </PageMessage>
    );
  }

  const { record, agent_available: agentAvailable } = data;
  const ActiveTab = TAB_COMPONENTS[activeTab];

  return (
    <div css={pageStyles} data-test-subj="investigationDetailPage">
      <div
        css={css`
          flex: 0 0 auto;
          padding-inline: ${euiTheme.size.l};
        `}
      >
        <DetailHeader record={record} openModal={setOpenModal} />
        <TabsBar
          record={record}
          activeTab={activeTab}
          onSelectTab={navigateTab}
          isSidePanelOpen={isSidePanelOpen}
          onShowSidePanel={() => setIsSidePanelOpen(true)}
        />
      </div>
      <div
        css={css`
          display: flex;
          flex: 1 1 auto;
          min-height: 0;
        `}
      >
        <main
          css={css`
            flex: 1 1 auto;
            min-width: 0;
            overflow-y: auto;
            padding: ${euiTheme.size.l};
          `}
          data-test-subj="investigationTabContent"
        >
          <ActiveTab
            record={record}
            agentAvailable={agentAvailable}
            onNavigateTab={navigateTab}
            openItemId={openItemId}
            onOpenModal={setOpenModal}
          />
        </main>
        {isSidePanelOpen ? (
          <div
            css={css`
              flex: 0 0 ${SIDE_PANEL_WIDTH};
              width: ${SIDE_PANEL_WIDTH};
              min-height: 0;
              border-inline-start: ${euiTheme.border.thin};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
            `}
          >
            <SidePanel
              record={record}
              agentAvailable={agentAvailable}
              activeTab={activeTab}
              mode={sidePanelMode}
              onModeChange={setSidePanelMode}
              onClose={() => setIsSidePanelOpen(false)}
              onNavigateTab={navigateTab}
            />
          </div>
        ) : null}
      </div>
      <ModalHost name={openModal} record={record} onClose={() => setOpenModal(null)} />
    </div>
  );
};
DetailPage.displayName = 'DetailPage';
