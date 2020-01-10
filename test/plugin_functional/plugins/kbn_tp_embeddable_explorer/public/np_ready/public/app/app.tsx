/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { EuiTab } from '@elastic/eui';
import React, { Component } from 'react';
import { CoreStart } from 'src/core/public';
import {
  GetEmbeddableFactory,
  GetEmbeddableFactories,
} from 'src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { TGetActionsCompatibleWithTrigger } from '../../../../../../../../src/plugins/ui_actions/public';
import { DashboardContainerExample } from './dashboard_container_example';
import { Start as InspectorStartContract } from '../../../../../../../../src/plugins/inspector/public';

export interface AppProps {
  getActions: TGetActionsCompatibleWithTrigger;
  getEmbeddableFactory: GetEmbeddableFactory;
  getAllEmbeddableFactories: GetEmbeddableFactories;
  overlays: CoreStart['overlays'];
  notifications: CoreStart['notifications'];
  inspector: InspectorStartContract;
  SavedObjectFinder: React.ComponentType<any>;
  I18nContext: CoreStart['i18n']['Context'];
}

export class App extends Component<AppProps, { selectedTabId: string }> {
  private tabs: Array<{ id: string; name: string }>;
  constructor(props: AppProps) {
    super(props);
    this.tabs = [
      {
        id: 'dashboardContainer',
        name: 'Dashboard Container',
      },
    ];

    this.state = {
      selectedTabId: 'helloWorldContainer',
    };
  }

  public onSelectedTabChanged = (id: string) => {
    this.setState({
      selectedTabId: id,
    });
  };

  public renderTabs() {
    return this.tabs.map((tab: { id: string; name: string }, index: number) => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab.id)}
        isSelected={tab.id === this.state.selectedTabId}
        key={index}
        data-test-subj={`embedExplorerTab-${tab.id}`}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  public render() {
    return (
      <this.props.I18nContext>
        <div id="dashboardViewport" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
          <div>{this.renderTabs()}</div>
          {this.getContentsForTab()}
        </div>
      </this.props.I18nContext>
    );
  }

  private getContentsForTab() {
    switch (this.state.selectedTabId) {
      case 'dashboardContainer': {
        return (
          <DashboardContainerExample
            getActions={this.props.getActions}
            getEmbeddableFactory={this.props.getEmbeddableFactory}
            getAllEmbeddableFactories={this.props.getAllEmbeddableFactories}
            overlays={this.props.overlays}
            notifications={this.props.notifications}
            inspector={this.props.inspector}
            SavedObjectFinder={this.props.SavedObjectFinder}
          />
        );
      }
    }
  }
}
