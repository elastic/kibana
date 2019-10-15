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
  EuiFieldText,
  EuiTextArea,
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
import { SavedObjectsClient } from 'kibana/public';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public';

interface Props {
  embeddable: IEmbeddable;
  onClose: () => void;
  savedObjectClient: SavedObjectsClient;
}

interface State {
  expression?: string;
}

export class CreateLensVisualizationModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      expression: `kibana
      | kibana_context
      | esEql eql="sequence with maxspan=5h [network where true] [process where true] | head 100" indexPattern="${
        this.props.embeddable.getInput().targetIndexPattern
      }" | render as="table"`,
    };
  }

  cancel = () => {
    this.props.onClose();
  };

  onCreate = async () => {
    if (this.props.embeddable.parent) {
      const ret = await this.props.savedObjectClient.create('lens', {
        expression: this.state.expression,
        state: { datasourceMetaData: { filterableIndexPatterns: [] } },
        title: '',
        visualizationType: '',
      });

      const embeddable = await this.props.embeddable.parent.addSavedObjectEmbeddable(
        'lens',
        ret.id
      );

      embeddable.updateInput({ queryEmitterId: this.props.embeddable.id });

      this.props.onClose();
    }
  };

  public render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle data-test-subj="customizePanelTitle">
            {i18n.translate('xpack.advancedUiActions.customizeTimeRange.modal.headerTitle', {
              defaultMessage:
                'Pretend this is a full visualization editor where the index pattern cannot be changed.',
            })}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiFlexItem>
            <EuiFormRow label="Index pattern that can't be changed">
              <EuiFieldText
                value={this.props.embeddable.getInput().targetIndexPattern}
                disabled={true}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow label="Expression" fullWidth>
              <EuiTextArea
                fullWidth
                value={this.state.expression}
                onChange={e => this.setState({ expression: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton data-test-subj="" onClick={this.onCreate} fill>
                {'Create'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModalFooter>
      </React.Fragment>
    );
  }
}
