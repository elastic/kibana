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
  EuiPageContentBody,
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFieldText,
} from '@elastic/eui';
import { Observable } from 'rxjs';
import { ISearchOptions } from 'src/plugins/search/public';
import { DoSearch } from './do_search';
import { GuideSection } from './guide_section';

import {
  IDemoDataRequest,
  IDemoDataResponse,
  DEMO_DATA_SEARCH_STRATEGY,
} from '../../demo_data_search/public';

const demoStrategyPath = '../../demo_data_search/server/demo_search_strategy';
// @ts-ignore
import demoStrategy from '!!raw-loader!./../../demo_data_search/server/demo_search_strategy';
// @ts-ignore
import doSearch from '!!raw-loader!./do_search.tsx';

interface Props {
  search: (
    request: IDemoDataRequest,
    options: ISearchOptions,
    strategy: string
  ) => Observable<IDemoDataResponse>;
}

interface State {
  results?: IDemoDataResponse;
  searching: boolean;
  responseTime: number;
  totalHitCount: number;
  changes: boolean;
  error?: any;
}

export class DemoStrategy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      searching: false,
      totalHitCount: 100,
      responseTime: 5,
      changes: false,
    };
  }

  renderDemo = () => {
    const request: IDemoDataRequest = {
      responseTime: this.state.responseTime,
      totalHitCount: this.state.totalHitCount,
    } as IDemoDataRequest;
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Response time">
              <EuiFieldText
                value={this.state.responseTime}
                onChange={e => this.setState({ responseTime: Number(e.target.value) })}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow label="Total hit count">
              <EuiFieldText
                value={this.state.totalHitCount}
                onChange={e => this.setState({ totalHitCount: Number(e.target.value) })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DoSearch
          request={request}
          strategy={DEMO_DATA_SEARCH_STRATEGY}
          search={(signal: AbortSignal) =>
            this.props.search({ ...request, id: undefined }, { signal }, DEMO_DATA_SEARCH_STRATEGY)
          }
        />
      </React.Fragment>
    );
  };

  render() {
    return (
      <EuiPageContentBody>
        <GuideSection
          codeSections={[
            {
              title: 'demo_search_strategy/demo_search_strategy.ts',
              code: demoStrategy,
            },
          ]}
          demo={this.renderDemo()}
        ></GuideSection>
      </EuiPageContentBody>
    );
  }
}
