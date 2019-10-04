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
  EuiForm,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFieldText,
  EuiTextArea,
} from '@elastic/eui';
import { IMessage } from './types';

interface Props {
  onSend: (message: IMessage) => void;
}

interface State {
  to: string;
  from: string;
  message: string;
}

export class SendMessageForm extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      to: 'Sue',
      from: 'Bob',
      message: 'How are you today?',
    };
  }

  sendMessage = () => {
    this.props.sendMessage({
      to: this.state.to,
      from: this.state.from,
      message: this.state.message,
    });
  };

  render() {
    return (
      <EuiForm>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="To">
              <EuiFieldText
                value={this.state.to}
                onChange={e => this.setState({ to: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFormRow label="From">
              <EuiFieldText
                value={this.state.from}
                onChange={e => this.setState({ from: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow label="From">
              <EuiTextArea
                value={this.state.message}
                onChange={e => this.setState({ message: e.target.value })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="sendMessage" onClick={this.sendMessage}>
              Send
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiForm>
    );
  }
}
