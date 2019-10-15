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
import { EqlSearchEmbeddable } from './eql_search_embeddable';
import { EQL_SEARCH_STRATEGY, IEqlSearchResponse } from '../../../common';

interface Props {
  embeddable: EqlSearchEmbeddable;
  search: ISearchGeneric;
}

interface State {
  eql?: string;
  targetIndexPattern?: string;
  useMitre: boolean;
}

export class EqlInputComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;
  private eqlOptions: Array<{ value: string; inputDisplay: string; dropdownDisplay: any }>;

  constructor(props: Props) {
    super(props);

    const rules = [
      {
        title: 'Unusual Child Process',
        eql: `process where event_subtype_full="creation_event" and
    (
      (process_name == "smss.exe" and not parent_process_name in ("System", "smss.exe")) or
      (process_name == "csrss.exe" and not parent_process_name in ("smss.exe", "svchost.exe")) or
      (process_name == "wininit.exe" and parent_process_name != "smss.exe") or
      (process_name == "winlogon.exe" and parent_process_name != "smss.exe") or
      (process_name == "lsass.exe" and parent_process_name != "wininit.exe") or
      (process_name == "LogonUI.exe" and not parent_process_name in ("winlogon.exe", "wininit.exe")) or
      (process_name == "services.exe" and parent_process_name != "wininit.exe") or
      (process_name == "svchost.exe" and parent_process_name != "services.exe" and
          not (parent_process_path == "*\\\\system32\\\\svchost.exe" and process_path ==  "*\\\\syswow64\\\\svchost.exe")
      ) or
      (process_name == "spoolsv.exe" and parent_process_name != "services.exe") or
      (process_name == "taskhost.exe" and not parent_process_name in ("services.exe", "svchost.exe")) or
      (process_name == "taskhostw.exe" and not parent_process_name in ("services.exe", "svchost.exe")) or
      (process_name == "userinit.exe" and not parent_process_name in ("dwm.exe", "winlogon.exe"))
    ) | head 100`,
      },
      {
        title: 'Sample',
        eql: `process where parent_process_path == "*\\\\system32\\\\svchost.exe" | head 100`,
      },
      {
        title: 'unique powershell commands',
        eql: `sequence by unique_pid with maxspan=2h   [process where opcode in (PROCESS_CREATE, PROCESS_ALREADY_RUNNING) and process_name == "powershell.exe" ]   [network where true] | unique command_line | head 100`,
      },
      {
        title: 'Unusual network scanning',
        eql: `network where opcode in (NETWORK_INCOMING, NETWORK_INCOMING_IPv6)
          | unique unique_pid destination_port
          | unique_count unique_pid | head 100`,
      },
    ];

    this.eqlOptions = rules.map(rule => ({
      value: rule.eql,
      inputDisplay: rule.title,
      dropdownDisplay: (
        <React.Fragment>
          <strong>{rule.title}</strong>
          <EuiText size="xs" color="subdued">
            <p className="euiTextColor--subdued">{rule.eql}</p>
          </EuiText>
        </React.Fragment>
      ),
    }));

    let useMitre = this.props.embeddable.getInput().eql ? false : true;
    if (this.props.embeddable.getInput().eql) {
      useMitre = !!this.eqlOptions.find(
        option => option.value === this.props.embeddable.getInput().eql
      );
    }

    this.state = {
      useMitre,
      eql: this.props.embeddable.getInput().eql || this.eqlOptions[0].value,
      targetIndexPattern: this.props.embeddable.getInput().targetIndexPattern,
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = Rx.merge(
      this.props.embeddable.getOutput$(),
      this.props.embeddable.getInput$()
    ).subscribe(() => {
      if (this.mounted && this.props.embeddable.getInput().eql) {
        this.setState({
          eql: this.props.embeddable.getInput().eql,
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
    this.props.embeddable.updateInput({
      eql: this.state.eql,
      targetIndexPattern: this.state.targetIndexPattern,
    });
  };

  render() {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label="EQL"
            labelAppend={
              <EuiText size="xs">
                <EuiLink
                  onClick={() => this.setState(prevState => ({ useMitre: !prevState.useMitre }))}
                >
                  {this.state.useMitre ? 'Use free form' : 'Use predefined rules'}
                </EuiLink>
              </EuiText>
            }
          >
            {this.state.useMitre ? (
              <EuiSuperSelect
                fullWidth
                options={this.eqlOptions}
                valueOfSelected={this.state.eql}
                onChange={e => this.setState({ eql: e })}
                itemLayoutAlign="top"
                hasDividers
              />
            ) : (
              <EuiFieldText
                fullWidth
                value={this.state.eql}
                onChange={e => this.setState({ eql: e.target.value })}
              />
            )}
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
