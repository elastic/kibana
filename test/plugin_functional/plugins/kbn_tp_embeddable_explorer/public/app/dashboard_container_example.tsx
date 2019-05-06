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
import { EuiButton } from '@elastic/eui';
import {
  DASHBOARD_CONTAINER_TYPE,
  DashboardContainer,
  DashboardContainerFactory,
} from 'plugins/dashboard_embeddable/index';
import {
  ErrorEmbeddable,
  ViewMode,
  EmbeddableFactoryRegistry,
  isErrorEmbeddable,
} from 'plugins/embeddable_api/index';
import React from 'react';
import { dashboardInput } from './dashboard_input';

export interface Props {
  embeddableFactories: EmbeddableFactoryRegistry;
}

export class DashboardContainerExample extends React.Component<Props, { viewMode: ViewMode }> {
  private mounted = false;
  private dashboardEmbeddableRoot: React.RefObject<HTMLDivElement>;
  private container: DashboardContainer | ErrorEmbeddable | undefined;

  public constructor(props: Props) {
    super(props);
    this.state = {
      viewMode: ViewMode.VIEW,
    };

    this.dashboardEmbeddableRoot = React.createRef();
  }

  public async componentDidMount() {
    this.mounted = true;
    const dashboardFactory = this.props.embeddableFactories.getFactoryByName(
      DASHBOARD_CONTAINER_TYPE
    ) as DashboardContainerFactory;
    if (dashboardFactory) {
      this.container = await dashboardFactory.create(dashboardInput);
      if (this.mounted && this.container && this.dashboardEmbeddableRoot.current) {
        this.container.renderInPanel(this.dashboardEmbeddableRoot.current);
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
    this.setState(prevState => {
      if (!this.container || isErrorEmbeddable<DashboardContainer>(this.container)) {
        return;
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
        <div id="dashboardViewport" ref={this.dashboardEmbeddableRoot} />
      </div>
    );
  }
}
