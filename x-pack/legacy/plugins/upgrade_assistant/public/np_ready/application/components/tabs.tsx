/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import { findIndex, get, set } from 'lodash';
import React from 'react';

import {
  EuiEmptyPrompt,
  EuiPageContent,
  EuiPageContentBody,
  EuiTabbedContent,
  EuiTabbedContentTab,
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { HttpSetup } from 'src/core/public';

import { UpgradeAssistantStatus } from '../../../../server/np_ready/lib/es_migration_apis';
import { LatestMinorBanner } from './latest_minor_banner';
import { CheckupTab } from './tabs/checkup';
import { OverviewTab } from './tabs/overview';
import { LoadingState, TelemetryState, UpgradeAssistantTabProps } from './types';

enum ClusterUpgradeState {
  needsUpgrade,
  partiallyUpgraded,
  upgraded,
}

interface TabsState {
  loadingState: LoadingState;
  loadingError?: Error;
  checkupData?: UpgradeAssistantStatus;
  selectedTabIndex: number;
  telemetryState: TelemetryState;
  clusterUpgradeState: ClusterUpgradeState;
}

type Props = ReactIntl.InjectedIntlProps & { http: HttpSetup };

export class UpgradeAssistantTabsUI extends React.Component<Props, TabsState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loadingState: LoadingState.Loading,
      clusterUpgradeState: ClusterUpgradeState.needsUpgrade,
      selectedTabIndex: 0,
      telemetryState: TelemetryState.Complete,
    };
  }

  public async componentDidMount() {
    await this.loadData();

    // Send telemetry info about the default selected tab
    this.sendTelemetryInfo(this.tabs[this.state.selectedTabIndex].id);
  }

  public render() {
    const { selectedTabIndex, telemetryState, clusterUpgradeState } = this.state;
    const tabs = this.tabs;

    if (clusterUpgradeState === ClusterUpgradeState.partiallyUpgraded) {
      return (
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiEmptyPrompt
              iconType="logoElasticsearch"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradingTitle"
                    defaultMessage="Your cluster is upgrading"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradingDescription"
                    defaultMessage="One or more Elasticsearch nodes have a newer version of
                      Elasticsearch than Kibana. Once all your nodes are upgraded, upgrade Kibana."
                  />
                </p>
              }
            />
          </EuiPageContentBody>
        </EuiPageContent>
      );
    } else if (clusterUpgradeState === ClusterUpgradeState.upgraded) {
      return (
        <EuiPageContent>
          <EuiPageContentBody>
            <EuiEmptyPrompt
              iconType="logoElasticsearch"
              title={
                <h2>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradeCompleteTitle"
                    defaultMessage="Your cluster has been upgraded"
                  />
                </h2>
              }
              body={
                <p>
                  <FormattedMessage
                    id="xpack.upgradeAssistant.tabs.upgradingInterstitial.upgradeCompleteDescription"
                    defaultMessage="All Elasticsearch nodes have been upgraded. You may now upgrade Kibana."
                  />
                </p>
              }
            />
          </EuiPageContentBody>
        </EuiPageContent>
      );
    }

    return (
      <EuiTabbedContent
        data-test-subj={
          telemetryState === TelemetryState.Running ? 'upgradeAssistantTelemetryRunning' : undefined
        }
        tabs={tabs}
        onTabClick={this.onTabClick}
        selectedTab={tabs[selectedTabIndex]}
      />
    );
  }

  private onTabClick = (selectedTab: EuiTabbedContentTab) => {
    const selectedTabIndex = findIndex(this.tabs, { id: selectedTab.id });
    if (selectedTabIndex === -1) {
      throw new Error(`Clicked tab did not exist in tabs array`);
    }

    // Send telemetry info about the current selected tab
    // only in case the clicked tab id it's different from the
    // current selected tab id
    if (this.tabs[this.state.selectedTabIndex].id !== selectedTab.id) {
      this.sendTelemetryInfo(selectedTab.id);
    }

    this.setSelectedTabIndex(selectedTabIndex);
  };

  private setSelectedTabIndex = (selectedTabIndex: number) => {
    this.setState({ selectedTabIndex });
  };

  private loadData = async () => {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(
        this.props.http.basePath.prepend('/api/upgrade_assistant/status')
      );
      this.setState({
        loadingState: LoadingState.Success,
        checkupData: resp.data,
      });
    } catch (e) {
      if (get(e, 'response.status') === 426) {
        this.setState({
          loadingState: LoadingState.Success,
          clusterUpgradeState: get(e, 'response.data.attributes.allNodesUpgraded', false)
            ? ClusterUpgradeState.upgraded
            : ClusterUpgradeState.partiallyUpgraded,
        });
      } else {
        this.setState({ loadingState: LoadingState.Error, loadingError: e });
      }
    }
  };

  private get tabs() {
    const { intl } = this.props;
    const { loadingError, loadingState, checkupData } = this.state;
    const commonProps: UpgradeAssistantTabProps = {
      loadingError,
      loadingState,
      refreshCheckupData: this.loadData,
      setSelectedTabIndex: this.setSelectedTabIndex,
      // Remove this in last minor of the current major (eg. 6.7)
      alertBanner: <LatestMinorBanner />,
    };

    return [
      {
        id: 'overview',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.overviewTab.overviewTabTitle',
          defaultMessage: 'Overview',
        }),
        content: <OverviewTab checkupData={checkupData} {...commonProps} />,
      },
      {
        id: 'cluster',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.checkupTab.clusterTabLabel',
          defaultMessage: 'Cluster',
        }),
        content: (
          <CheckupTab
            key="cluster"
            deprecations={checkupData ? checkupData.cluster : undefined}
            checkupLabel={intl.formatMessage({
              id: 'xpack.upgradeAssistant.tabs.checkupTab.clusterLabel',
              defaultMessage: 'cluster',
            })}
            {...commonProps}
          />
        ),
      },
      {
        id: 'indices',
        name: intl.formatMessage({
          id: 'xpack.upgradeAssistant.checkupTab.indicesTabLabel',
          defaultMessage: 'Indices',
        }),
        content: (
          <CheckupTab
            key="indices"
            deprecations={checkupData ? checkupData.indices : undefined}
            checkupLabel={intl.formatMessage({
              id: 'xpack.upgradeAssistant.checkupTab.indexLabel',
              defaultMessage: 'index',
            })}
            showBackupWarning
            {...commonProps}
          />
        ),
      },
    ];
  }

  private async sendTelemetryInfo(tabName: string) {
    // In case we don't have any data yet, we wanna to ignore the
    // telemetry info update
    if (this.state.loadingState !== LoadingState.Success) {
      return;
    }

    this.setState({ telemetryState: TelemetryState.Running });

    await this.props.http.fetch('/api/upgrade_assistant/telemetry/ui_open', {
      method: 'PUT',
      body: JSON.stringify(set({}, tabName, true)),
    });

    this.setState({ telemetryState: TelemetryState.Complete });
  }
}

export const UpgradeAssistantTabs = injectI18n(UpgradeAssistantTabsUI);
