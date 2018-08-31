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

class Main extends React.Component {

  chartDiv = React.createRef();
  state = {
    loading: false,
  };

  onSelectSample = async (ev) => {
    if (ev.target.selectedIndex > 0) {
      if (this.handler) {
        this.handler.destroy();
      }
      this.setState({ loading: true });
      const sample = embeddingSamples[ev.target.selectedIndex - 1];
      this.handler = await sample.run(this.chartDiv.current);
      await this.handler.whenFirstRenderComplete();
      this.setState({ loading: false });
    }
  };

  render() {
    const samples = [
      { value: '', text: '' },
      ...embeddingSamples.map(sample => ({
        value: `sample-${sample.id}`,
        text: sample.title,
      }))
    ];

    return (
      <EuiPage>
        <EuiPageBody>
          <EuiPageContent>
            <EuiPageContentHeader>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiFormRow label="Select example">
                    <EuiSelect
                      data-test-subj="sampleSelect"
                      options={samples}
                      onChange={this.onSelectSample}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                { this.state.loading &&
                  <EuiFlexItem>
                    <EuiLoadingChart size="xl" data-test-subj="visLoadingIndicator" />
                  </EuiFlexItem>
                }
              </EuiFlexGroup>
            </EuiPageContentHeader>
            <EuiPageContentBody>
              <div ref={this.chartDiv} style={{ height: '500px', display: 'flex' }} />
            </EuiPageContentBody>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export { Main };
