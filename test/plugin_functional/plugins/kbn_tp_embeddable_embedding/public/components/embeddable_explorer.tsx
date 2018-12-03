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

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiSelect,
} from '@elastic/eui';
import React, { ChangeEvent } from 'react';

import { EmbeddableFactory } from 'ui/embeddable';

export interface EmbeddableExplorerState {
  factoryName: string;
  selectedConfiguration: EmbeddableConfiguration;
}

interface EmbeddableExporerProps {
  factories: EmbeddableFactory[];
}

export class EmbeddableExplorer extends React.Component<
  EmbeddableExporerProps,
  EmbeddableExplorerState
> {
  public state: EmbeddableExplorerState = {
    factoryName: '',
  };
  private chartDiv = React.createRef<HTMLDivElement>();

  public render() {
    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>{this.renderEmbeddableTypeSelector()}</EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Select embedding parameters">
                    <EuiSelect
                      data-test-subj="embeddingParamsSelect"
                      options={this.state.embeddableConfigs}
                      onChange={this.onSelectEmbeddableConfig}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                {this.state.loading && (
                  <EuiFlexItem>
                    <EuiLoadingChart size="xl" data-test-subj="visLoadingIndicator" />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              {/*
                The element you want to render into should have its dimension set (via a fixed height, flexbox, absolute positioning, etc.),
                since the visualization will render with exactly the size of that element, i.e. the container size determines the
                visualization size.
               */}
              <div ref={this.chartDiv} style={{ height: '500px' }} />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }

  private onEmbeddableTypeSelection(ev: ChangeEvent<HTMLSelectElement>) {
    const factoryName = ev.target.value;
    const factory = factories.getFactoryByName(state.factoryName);
    const embeddableConfigs = factory.list();
    this.setState({ factoryName, embeddableConfigs });
  }

  private renderEmbeddableTypeSelector() {
    return (
      <EuiFormRow label="Select Embeddable Type">
        <EuiSelect
          data-test-subj="embeddableTypeSelector"
          options={this.props.factories.map(factory => ({
            text: factory.name,
            value: factory.name,
          }))}
          onChange={this.onEmbeddableTypeSelection}
        />
      </EuiFormRow>
    );
  }

  private embedVisualization = async () => {
    if (this.embeddable) {
      // Whenever a visualization is about to be removed from DOM that you embedded,
      // you need to call `destroy` on the handler to make sure the visualization is
      // teared down correctly.
      this.embeddable.destroy();
    }

    if (this.chartDiv && this.chartDiv.current) {
      this.chartDiv.current.innerHTML = '';
    }

    const { selectedConfiguration } = this.state;
    if (selectedParams && selectedVis) {
      this.setState({ loading: true });
      const sample = embeddingSamples.find(el => el.id === selectedParams);
      this.handler = await sample.run(this.chartDiv.current, selectedVis);
      // handler.whenFirstRenderComplete() will return a promise that resolves once the first
      // rendering after embedding has finished.
      await this.handler.whenFirstRenderComplete();
      this.setState({ loading: false });
    }
  };

  private onChangeEmbeddable = ev => {
    this.setState(
      {
        selectedEmbeddable: ev.target.value,
      },
      this.embedVisualization
    );
  };
}
