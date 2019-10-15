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
  EuiFieldText,
  EuiFlexItem,
  EuiText,
  EuiFlexGroup,
  EuiLink,
  EuiSuperSelect,
} from '@elastic/eui';

import { Subscription } from 'rxjs';
import { EuiButton, EuiFormRow } from '@elastic/eui';
import * as Rx from 'rxjs';
import { ISearchGeneric } from 'src/plugins/data/public';
import { Filter } from '@kbn/es-query';
import { sleep } from '@elastic/eui';
import ReactFocusLock from 'react-focus-lock';
import { UsecaseInputEmbeddable } from './usecase_input_embeddable';
import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../../common';

interface Props {
  embeddable: UsecaseInputEmbeddable;
}

interface State {
  indexPattern?: string;
}

export class UsecaseInputComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;
  private usecaseOptions: Array<{ value: string; inputDisplay: string }>;

  constructor(props: Props) {
    super(props);

    const useCases = [
      {
        title: 'Prod',
        indexPattern: '*-prod-*-*-*',
      },
      {
        title: 'Dev',
        indexPattern: '*-dev-*-*-*',
      },
      {
        title: 'West',
        indexPattern: '*-west-*-*-*',
      },
    ];

    this.usecaseOptions = useCases.map(useCase => ({
      value: useCase.indexPattern,
      inputDisplay: useCase.title,
    }));

    this.state = {
      indexPattern: this.props.embeddable.getInput().indexPattern,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted && this.props.embeddable.getInput().indexPattern) {
        this.setState({
          indexPattern: this.props.embeddable.getInput().indexPattern,
        });

        //        this.props.embeddable.parent.updateInput(filters: )
      }
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.mounted = false;
  }

  doQuery = () => {};

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth label="Select use case">
            <EuiSuperSelect
              fullWidth
              options={this.usecaseOptions}
              valueOfSelected={this.state.indexPattern}
              onChange={e => this.setState({ indexPattern: e })}
              itemLayoutAlign="top"
              hasDividers
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
