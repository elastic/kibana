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
import { EmbeddableStart } from 'src/plugins/embeddable/public';
import { DashboardContainerExample } from './dashboard_container_example';

export interface AppProps {
  embeddableServices: EmbeddableStart;
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
      <div id="dashboardViewport" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
        <div>{this.renderTabs()}</div>
        {this.getContentsForTab()}
      </div>
    );
  }

  private getContentsForTab() {
    switch (this.state.selectedTabId) {
      case 'dashboardContainer': {
        return <DashboardContainerExample embeddableServices={this.props.embeddableServices} />;
      }
    }
  }
}
