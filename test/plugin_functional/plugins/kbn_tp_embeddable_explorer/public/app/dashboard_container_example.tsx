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
import React from 'react';
import { EuiButton, EuiLoadingChart } from '@elastic/eui';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
  DashboardContainerFactory,
} from 'plugins/dashboard_embeddable_container';

import {
  ErrorEmbeddable,
  ViewMode,
  isErrorEmbeddable,
  EmbeddablePanel,
  embeddableFactories,
} from 'plugins/embeddable_api';

import { dashboardInput } from './dashboard_input';

interface State {
  loaded: boolean;
  viewMode: ViewMode;
}

export class DashboardContainerExample extends React.Component<{}, State> {
  private mounted = false;
  private container: DashboardContainer | ErrorEmbeddable | undefined;

  public constructor() {
    super({});
    this.state = {
      viewMode: ViewMode.VIEW,
      loaded: false,
    };
  }

  public async componentDidMount() {
    this.mounted = true;
    const dashboardFactory = embeddableFactories.get(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;
    if (dashboardFactory) {
      this.container = await dashboardFactory.create(dashboardInput);
      if (this.mounted) {
        this.setState({ loaded: true });
      }
    }
  }

  public componentWillUnmount() {
    this.mounted = false;
    if (this.container) {
      this.container.destroy();
    }
  }

  public switchViewMode = () => {
    this.setState((prevState: State) => {
      if (!this.container || isErrorEmbeddable<DashboardContainer>(this.container)) {
        return prevState;
      }
      const newMode = prevState.viewMode === ViewMode.VIEW ? ViewMode.EDIT : ViewMode.VIEW;
      this.container.updateInput({ viewMode: newMode });
      return { viewMode: newMode };
    });
  };

  public render() {
    return (
      <div className="app-container dshAppContainer">
        <h1>Dashboard Container</h1>
        <EuiButton onClick={this.switchViewMode}>
          {this.state.viewMode === ViewMode.VIEW ? 'Edit' : 'View'}
        </EuiButton>
        {!this.state.loaded || !this.container ? (
          <EuiLoadingChart size="l" mono />
        ) : (
          <EmbeddablePanel embeddable={this.container} />
        )}
      </div>
    );
  }
}
