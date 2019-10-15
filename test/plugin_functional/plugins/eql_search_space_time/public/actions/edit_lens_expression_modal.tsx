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
  EuiTextArea,
  EuiFieldText,
  EuiModal,
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
import { LensEmbeddable } from '../../../../../../x-pack/legacy/plugins/lens/public';

interface Props {
  embeddable: LensEmbeddable;
  onClose: () => void;
}

interface State {
  expression?: string;
}

export class EditExpressionModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      expression: props.embeddable.getInput().expression,
    };
  }

  cancel = () => {
    this.props.onClose();
  };

  onChange = () => {
    this.props.embeddable.updateInput({ expression: this.state.expression });
    this.props.onClose();
  };

  public render() {
    return (
      <EuiModal maxWidth="700px" onClose={this.props.onClose}>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
            {i18n.translate('xpack.advancedUiActions.customizeTimeRange.modal.headerTitle', {
              defaultMessage: 'Update expression',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFormRow label="">
            <EuiTextArea
              fullWidth
              value={this.state.expression}
              onChange={e => this.setState({ expression: e.target.value })}
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="" onClick={this.onChange} fill>
                {'Update'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </EuiModal>
    );
  }
}
