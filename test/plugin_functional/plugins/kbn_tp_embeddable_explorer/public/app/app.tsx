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
import { EmbeddableFactoryRegistry } from 'plugins/embeddable_api/index';
import React, { Component } from 'react';
import { DashboardContainerExample } from './dashboard_container_example';
import { HelloWorldEmbeddableExample } from './hello_world_embeddable_example';
import { ListContainerExample } from './list_container_example';
import { VisualizeEmbeddableExample } from './visualize_embeddable_example';

export interface AppProps {
  embeddableFactories: EmbeddableFactoryRegistry;
}

export class App extends Component<AppProps, { selectedTabId: string }> {
  private tabs: Array<{ id: string; name: string }>;
  constructor(props: AppProps) {
    super(props);
    this.tabs = [
      {
        id: 'dashboardEmbeddable',
        name: 'Dashboard Container',
      },
      {
        id: 'customContainer',
        name: 'Custom Container',
      },
      {
        id: 'visualizeEmbeddable',
        name: 'Visualize Embeddable',
      },
      {
        id: 'helloWorldEmbeddable',
        name: 'Hello World Embeddable',
      },
    ];

    this.state = {
      selectedTabId: 'dashboardEmbeddable',
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
      >
        {tab.name}
      </EuiTab>
    ));
  }

  public render() {
    return (
      <div id="dashboardViewport">
        <div>{this.renderTabs()}</div>
        {this.getContentsForTab()}
      </div>
    );
  }

  private getContentsForTab() {
    switch (this.state.selectedTabId) {
      case 'dashboardEmbeddable': {
        return <DashboardContainerExample embeddableFactories={this.props.embeddableFactories} />;
      }
      case 'customContainer': {
        return <ListContainerExample embeddableFactories={this.props.embeddableFactories} />;
      }
      case 'visualizeEmbeddable': {
        return <VisualizeEmbeddableExample embeddableFactories={this.props.embeddableFactories} />;
      }
      case 'helloWorldEmbeddable': {
        return <HelloWorldEmbeddableExample />;
      }
    }
  }
}
