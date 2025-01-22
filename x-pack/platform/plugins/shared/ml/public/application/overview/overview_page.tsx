/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiTab, EuiTabs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { mlTimefilterRefresh$ } from '@kbn/ml-date-picker';
import { useStorage } from '@kbn/ml-local-storage';
import { OverviewStatsBar } from '../components/collapsible_panel/collapsible_panel';
import type { MlStorageKey, TMlStorageMapped } from '../../../common/types/storage';
import { ML_OVERVIEW_PANELS, ML_OVERVIEW_PANELS_EXTENDED } from '../../../common/types/storage';
import { CollapsiblePanel } from '../components/collapsible_panel';
import { usePermissionCheck } from '../capabilities/check_capabilities';
import { mlNodesAvailable } from '../ml_nodes_check';
import { OverviewContent } from './components/content';
import { NodeAvailableWarning } from '../components/node_available_warning';
import { JobsAwaitingNodeWarning } from '../components/jobs_awaiting_node_warning';
import { SavedObjectsWarning } from '../components/saved_objects_warning';
import { UpgradeWarning } from '../components/upgrade';
import { HelpMenu } from '../components/help_menu';
import { useMlKibana } from '../contexts/kibana';
import { NodesList } from '../memory_usage/nodes_overview';
import { MlPageHeader } from '../components/page_header';
import { PageTitle } from '../components/page_title';
import { getMlNodesCount } from '../ml_nodes_check/check_ml_nodes';
import { MemoryPage } from '../memory_usage/memory_tree_map/memory_page';
import { NotificationsList } from '../notifications/components/notifications_list';

export const overviewPanelDefaultState = Object.freeze({
  nodes: true,
  adJobs: true,
  dfaJobs: true,
});
const overviewPanelExtendedDefaultState = Object.freeze({
  memoryUsage: true,
});

enum TAB_IDS {
  OVERVIEW = 'overview',
  NOTIFICATIONS = 'notifications',
}
export type TabIdType = (typeof TAB_IDS)[keyof typeof TAB_IDS];

export const OverviewPage: FC<{ timefilter: TimefilterContract }> = ({ timefilter }) => {
  const [canViewMlNodes, canCreateJob] = usePermissionCheck(['canViewMlNodes', 'canCreateJob']);

  const disableCreateAnomalyDetectionJob = !canCreateJob || !mlNodesAvailable();
  const {
    services: { docLinks },
  } = useMlKibana();
  const helpLink = docLinks.links.ml.guide;

  const [selectedTabId, setSelectedTabId] = useState<TabIdType>(TAB_IDS.OVERVIEW);
  const [adLazyJobCount, setAdLazyJobCount] = useState(0);
  const [dfaLazyJobCount, setDfaLazyJobCount] = useState(0);

  const [panelsState, setPanelsState] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_OVERVIEW_PANELS>
  >(ML_OVERVIEW_PANELS, overviewPanelDefaultState);

  const [panelsExtendedState, setPanelsExtendedState] = useStorage<
    MlStorageKey,
    TMlStorageMapped<typeof ML_OVERVIEW_PANELS_EXTENDED>
  >(ML_OVERVIEW_PANELS_EXTENDED, overviewPanelExtendedDefaultState);

  const tabs = useMemo(
    () => [
      {
        id: TAB_IDS.OVERVIEW,
        name: (
          <FormattedMessage id="xpack.ml.overview.overviewTabLabel" defaultMessage="Overview" />
        ),
        content: (
          <>
            {canViewMlNodes ? (
              <>
                <CollapsiblePanel
                  isOpen={panelsExtendedState.memoryUsage}
                  onToggle={(update) => {
                    setPanelsExtendedState({ ...panelsExtendedState, memoryUsage: update });
                  }}
                  header={
                    <FormattedMessage
                      id="xpack.ml.overview.memoryUsagePanel.header"
                      defaultMessage="Memory Usage"
                    />
                  }
                  ariaLabel={i18n.translate('xpack.ml.overview.memoryUsagePanel.ariaLabel', {
                    defaultMessage: 'Memory usage panel',
                  })}
                >
                  <MemoryPage />
                </CollapsiblePanel>
                <EuiSpacer size="m" />
              </>
            ) : null}

            {canViewMlNodes ? (
              <>
                <CollapsiblePanel
                  isOpen={panelsState.nodes}
                  onToggle={(update) => {
                    setPanelsState({ ...panelsState, nodes: update });
                  }}
                  header={
                    <FormattedMessage
                      id="xpack.ml.overview.nodesPanel.header"
                      defaultMessage="Nodes"
                    />
                  }
                  headerItems={[
                    <OverviewStatsBar
                      inputStats={[
                        {
                          label: i18n.translate('xpack.ml.overview.nodesPanel.totalNodesLabel', {
                            defaultMessage: 'Total',
                          }),
                          value: getMlNodesCount(),
                          'data-test-subj': 'mlTotalNodesCount',
                        },
                      ]}
                      dataTestSub={'mlOverviewAnalyticsStatsBar'}
                    />,
                  ]}
                  ariaLabel={i18n.translate('xpack.ml.overview.nodesPanel.ariaLabel', {
                    defaultMessage: 'overview panel',
                  })}
                >
                  <NodesList compactView />
                </CollapsiblePanel>
                <EuiSpacer size="m" />
              </>
            ) : null}

            <OverviewContent
              createAnomalyDetectionJobDisabled={disableCreateAnomalyDetectionJob}
              setAdLazyJobCount={setAdLazyJobCount}
              setDfaLazyJobCount={setDfaLazyJobCount}
            />
          </>
        ),
      },
      {
        id: TAB_IDS.NOTIFICATIONS,
        name: (
          <FormattedMessage
            id="xpack.ml.overview.notificationsTabLabel"
            defaultMessage="Notifications"
          />
        ),
        content: <NotificationsList />,
      },
    ],
    [
      canViewMlNodes,
      disableCreateAnomalyDetectionJob,
      setPanelsState,
      setPanelsExtendedState,
      panelsState,
      panelsExtendedState,
    ]
  );

  const renderTabs = () => {
    return tabs.map((tab) => (
      <EuiTab
        key={tab.id}
        onClick={() => setSelectedTabId(tab.id)}
        isSelected={tab.id === selectedTabId}
        data-test-subj={`mlManagmentOverviewPageTabs ${tab.id}`}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <div>
      <MlPageHeader>
        <PageTitle
          title={i18n.translate('xpack.ml.overview.overviewLabel', {
            defaultMessage: 'Overview',
          })}
        />
      </MlPageHeader>
      <NodeAvailableWarning />
      <JobsAwaitingNodeWarning jobCount={adLazyJobCount + dfaLazyJobCount} />
      <SavedObjectsWarning
        onCloseFlyout={() => {
          const { from, to } = timefilter.getTime();
          const timeRange = { start: from, end: to };
          mlTimefilterRefresh$.next({
            lastRefresh: Date.now(),
            timeRange,
          });
        }}
      />
      <UpgradeWarning />
      <EuiTabs>{renderTabs()}</EuiTabs>
      <EuiSpacer />
      {tabs.find((tab) => tab.id === selectedTabId)?.content}
      <HelpMenu docLink={helpLink} />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default OverviewPage;
