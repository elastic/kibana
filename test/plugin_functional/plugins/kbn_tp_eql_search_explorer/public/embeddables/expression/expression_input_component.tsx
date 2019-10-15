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
import { EuiTextArea, EuiFlexItem, EuiFlexGroup, EuiFormRow } from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiButton } from '@elastic/eui';
import * as Rx from 'rxjs';
import { ISearchGeneric } from 'src/plugins/data/public';
import { Filter } from '@kbn/es-query';
import { ExpressionEmbeddable } from './expression_embeddable';
import { SQL_SEARCH_STRATEGY, ISqlSearchResponse } from '../../../common';

interface Props {
  embeddable: ExpressionEmbeddable;
  search: ISearchGeneric;
}

interface State {
  expression?: string;
}

export class ExpressionInputComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      expression: this.props.embeddable.getInput().expression || '',
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted && this.props.embeddable.getInput().expression) {
        this.setState({
          expression: this.props.embeddable.getInput().expression,
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
      .search({ sql: this.state.expression || '' }, {}, SQL_SEARCH_STRATEGY)
      .subscribe(async (results: ISqlSearchResponse) => {
        const indexName = results.index;
        setTimeout(() => {
          this.props.embeddable.updateInput({
            expression: this.state.expression,
          });
        }, 1000);
      });
  };

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow label="SQL">
            <EuiTextArea
              fullWidth
              value={this.state.expression}
              onChange={e => this.setState({ expression: e.target.value })}
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
