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
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingChart,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiSelect,
} from '@elastic/eui';

import { embeddingSamples } from '../embedding';

const VISUALIZATION_OPTIONS = [
  { value: '', text: '' },
  { value: 'timebased', text: 'Time based' },
  { value: 'timebased_with-filters', text: 'Time based (with filters)' },
  { value: 'timebased_no-datehistogram', text: 'Time based data without date histogram' },
];

class Main extends React.Component {
  chartDiv = React.createRef();
  state = {
    loading: false,
    selectedParams: null,
    selectedVis: null,
  };

  embedVisualization = async () => {
    if (this.handler) {
      // Whenever a visualization is about to be removed from DOM that you embedded,
      // you need to call `destroy` on the handler to make sure the visualization is
      // teared down correctly.
      this.handler.destroy();
      this.chartDiv.current.innerHTML = '';
    }

    const { selectedParams, selectedVis } = this.state;
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

  onChangeVisualization = async ev => {
    this.setState(
      {
        selectedVis: ev.target.value,
      },
      this.embedVisualization
    );
  };

  onSelectSample = async ev => {
    this.setState(
      {
        selectedParams: ev.target.value,
      },
      this.embedVisualization
    );
  };

  render() {
    const samples = [
      { value: '', text: '' },
      ...embeddingSamples.map(({ id, title }) => ({
        value: id,
        text: title,
      })),
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Select visualizations">
                    <EuiSelect
                      data-test-subj="visSelect"
                      options={VISUALIZATION_OPTIONS}
                      onChange={this.onChangeVisualization}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFormRow label="Select embedding parameters">
                    <EuiSelect
                      data-test-subj="embeddingParamsSelect"
                      options={samples}
                      onChange={this.onSelectSample}
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
}

export { Main };
