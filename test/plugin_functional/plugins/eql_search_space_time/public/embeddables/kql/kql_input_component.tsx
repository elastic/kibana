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
import { EuiFieldText, EuiFlexItem, EuiFlexGroup, EuiFormRow } from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiButton } from '@elastic/eui';
import * as Rx from 'rxjs';
import { ISearchGeneric } from 'src/plugins/data/public';
import { Filter } from '@kbn/es-query';
import { KqlSearchEmbeddable } from './kql_search_embeddable';
import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../../common';

interface Props {
  embeddable: KqlSearchEmbeddable;
  search: ISearchGeneric;
}

interface State {
  kql?: string;
  indexPattern?: string;
}

export class KqlInputComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      kql: this.props.embeddable.getInput().kql || '',
      indexPattern: this.props.embeddable.getInput().indexPattern,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted && this.props.embeddable.getInput().kql) {
        this.setState({
          kql: this.props.embeddable.getInput().kql,
        });
      }
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.mounted = false;
  }

  doQuery = () => {
    const query = {
      query: this.state.kql,
      language: 'kuery',
    };
    this.props.embeddable.updateInput({
      kql: this.state.kql,
      query,
      indexPattern: this.state.indexPattern,
    });
  };

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="Index pattern">
            <EuiFieldText
              placeholder="use default"
              value={this.state.indexPattern}
              onChange={e => this.setState({ indexPattern: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Kql">
            <EuiFieldText
              value={this.state.kql}
              onChange={e => this.setState({ kql: e.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton onClick={this.doQuery}>Query</EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
