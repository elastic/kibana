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
  EuiFieldText,
  EuiFormRow,
  EuiFlexItem,
  EuiDatePicker,
  EuiFlexGroup,
  EuiFieldNumber,
} from '@elastic/eui';
import { Observable } from 'rxjs';
import { IEsSearchResponse } from 'src/plugins/es_search/public';
import moment from 'moment';
import { ISearchOptions } from '../../../../../src/plugins/search/public';
import { DoSearch } from './do_search';
import {
  TIME_CHUNK_ES_SEARCH_STRATEGY,
  ITimeChunkEsRequest,
} from '../../time_chunk_es_search/public';
import { GuideSection } from './guide_section';

interface Props {
  search: (
    request: ITimeChunkEsRequest,
    options: ISearchOptions,
    strategy: string
  ) => Observable<IEsSearchResponse<any>>;
}

interface State {
  query: string;
  results?: IEsSearchResponse<any>;
  index: string;
  searching: boolean;
  request: ITimeChunkEsRequest;
  strategy?: string;
  changes: boolean;
  error?: any;
  from: number;
  to: number;
  timeField: string;
  increment: number;
}

export class TimeChunkSearchStrategy extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const now = moment();

    const from = now.subtract(15, 'days').unix();
    const to = now.unix();
    const timeField = 'timestamp';
    const increment = 5;

    this.state = {
      query: '',
      index: '*',
      searching: false,
      request: this.getRequest({ index: '*', query: '', to, from, timeField, increment }),
      changes: false,
      from,
      to,
      timeField,
      increment,
    };
  }

  getRequest({
    index,
    query,
    from,
    to,
    timeField,
    increment,
  }: {
    index: string;
    query: string;
    from: number;
    to: number;
    timeField: string;
    increment: number;
  }): ITimeChunkEsRequest {
    return {
      timeRange: {
        from,
        to,
        timeField,
      },
      timeIncrement: increment * 60 * 60, // convert hours to s
      debug: true,
      params: {
        index,
        body: {
          query: {
            match_all: {},
          },
        },
      },
    };
  }

  renderDemo() {
    const request: ITimeChunkEsRequest = this.getRequest(this.state);
    return (
      <React.Fragment>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="Index pattern">
              <EuiFieldText
                value={this.state.index}
                onChange={e => this.setState({ index: e.target.value, changes: true })}
              />
            </EuiFormRow>
            <EuiFormRow label="Time increment (in hours)">
              <EuiFieldNumber
                value={this.state.increment}
                onChange={e =>
                  this.setState({ increment: parseInt(e.target.value, 10), changes: true })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="From">
              <EuiDatePicker
                selected={moment.unix(this.state.from)}
                onChange={from => this.setState({ from: from!.unix(), changes: true })}
                inline
                showTimeSelect
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="To">
              <EuiDatePicker
                selected={moment.unix(this.state.to)}
                onChange={to => this.setState({ to: to!.unix(), changes: true })}
                inline
                showTimeSelect
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <DoSearch
          request={request}
          search={(signal: AbortSignal) =>
            this.props.search(
              { ...request, id: undefined },
              { signal },
              TIME_CHUNK_ES_SEARCH_STRATEGY
            )
          }
        />
      </React.Fragment>
    );
  }

  render() {
    return (
      <EuiPageContentBody>
        <GuideSection codeSections={[]} demo={this.renderDemo()}></GuideSection>
      </EuiPageContentBody>
    );
  }
}
