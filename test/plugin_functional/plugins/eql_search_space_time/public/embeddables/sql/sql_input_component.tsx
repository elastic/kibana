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
import { SqlSearchEmbeddable } from './sql_search_embeddable';
import { SQL_SEARCH_STRATEGY, ISqlSearchResponse } from '../../../common';

interface Props {
  embeddable: SqlSearchEmbeddable;
  search: ISearchGeneric;
}

interface State {
  sql?: string;
  indexPattern?: string;
}

export class SqlInputComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      sql: this.props.embeddable.getInput().sql || '',
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted && this.props.embeddable.getInput().sql) {
        this.setState({
          sql: this.props.embeddable.getInput().sql,
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
    this.props
      .search({ sql: this.state.sql || '' }, {}, SQL_SEARCH_STRATEGY)
      .subscribe(async (results: ISqlSearchResponse) => {
        const indexName = results.index;
        setTimeout(() => {
          this.props.embeddable.updateInput({
            sql: this.state.sql,
            indexPattern: indexName,
          });
        }, 1000);
      });
  };

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="SQL">
            <EuiFieldText
              fullWidth
              value={this.state.sql}
              onChange={e => this.setState({ sql: e.target.value })}
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
