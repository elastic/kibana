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

import React, { Component } from 'react';

import {
  EuiSelect,
  EuiFormRow,
  EuiButton,
  EuiModalHeader,
  EuiModalFooter,
  EuiModalBody,
  EuiModalHeaderTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';
import { DataSourceInput } from './data_source_input';

interface Props {
  embeddable: IEmbeddable<DataSourceInput>;
  onClose: () => void;
}

interface State {
  queryEmitterId?: string;
}

export class ChangeQueryModal extends Component<Props, State> {
  private otherChildren: IEmbeddable[] = [];
  constructor(props: Props) {
    super(props);
    const root = this.props.embeddable.getRoot();
    this.state = {
      query: JSON.stringify(props.embeddable.getInput().query),
      filters: JSON.stringify(props.embeddable.getInput().filters),
    };
  }

  cancel = () => {
    this.props.onClose();
  };

  onSelect = () => {
    const emitter = this.otherChildren.find(child => child.id === this.state.queryEmitterId);

    if (!emitter) {
      throw new Error('not found');
    }

    // emitter.getInput$().subscribe(input => {
    //   this.props.embeddable.updateInput({
    //     filters: input.filters,
    //     indexPattern: input.indexPattern,
    //   });
    // });

    this.props.embeddable.updateInput({ queryEmitterId: this.state.queryEmitterId });
    this.props.onClose();
  };

  public render() {
    const queryEmitterIdOptions: Array<{ value: string; text: string }> = [];
    const root = this.props.embeddable.getRoot();

    if (root.getIsContainer()) {
      this.otherChildren.forEach(child => {
        queryEmitterIdOptions.push({ value: child.id, text: `${child.getTitle()}` });
      });
    }

    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
            {i18n.translate('xpack.advancedUiActions.customizeTimeRange.modal.headerTitle', {
              defaultMessage: 'Select data source',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label="">
            <EuiSelect
              options={queryEmitterIdOptions}
              value={this.state.queryEmitterId}
              onChange={e => this.setState({ queryEmitterId: e.target.value })}
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="" onClick={this.onSelect} fill>
                {'Select'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </React.Fragment>
    );
  }
}
