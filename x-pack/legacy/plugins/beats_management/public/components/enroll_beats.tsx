/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiBasicTable,
  EuiButton,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiModalBody,
  // @ts-ignore
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { capitalize } from 'lodash';
import React from 'react';
import { CMBeat } from '../../common/domain_types';

interface ComponentProps {
  /** Such as kibanas basePath, for use to generate command */
  frameworkBasePath?: string;
  enrollmentToken?: string;
  getBeatWithToken(token: string): Promise<CMBeat | null>;
  createEnrollmentToken(): Promise<void>;
  onBeatEnrolled(enrolledBeat: CMBeat): void;
}

interface ComponentState {
  enrolledBeat: CMBeat | null;
  hasPolledForBeat: boolean;
  command: string;
  beatType: string;
}

export class EnrollBeat extends React.Component<ComponentProps, ComponentState> {
  private pinging = false;
  constructor(props: ComponentProps) {
    super(props);

    this.state = {
      enrolledBeat: null,
      hasPolledForBeat: false,
      command: 'sudo {{beatType}}',
      beatType: 'filebeat',
    };
  }
  public pingForBeatWithToken = async (token: string): Promise<CMBeat | void> => {
    try {
      const beats = await this.props.getBeatWithToken(token);

      if (!beats) {
        throw new Error('no beats');
      }
      return beats;
    } catch (err) {
      if (this.pinging) {
        const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));
        await timeout(5000);
        return await this.pingForBeatWithToken(token);
      }
    }
  };
  public async componentDidMount() {
    if (!this.props.enrollmentToken) {
      await this.props.createEnrollmentToken();
    }
  }
  public waitForTokenToEnrollBeat = async () => {
    if (this.pinging || !this.props.enrollmentToken) {
      return;
    }
    this.pinging = true;
    const enrolledBeat = (await this.pingForBeatWithToken(this.props.enrollmentToken)) as CMBeat;

    this.setState({
      enrolledBeat,
    });
    this.props.onBeatEnrolled(enrolledBeat);
    this.pinging = false;
  };
  public render() {
    if (!this.props.enrollmentToken && !this.state.enrolledBeat) {
      return null;
    }
    if (this.props.enrollmentToken && !this.state.enrolledBeat) {
      this.waitForTokenToEnrollBeat();
    }
    const cmdText = `${this.state.command
      .replace('{{beatType}}', this.state.beatType)
      .replace('{{beatTypeInCaps}}', capitalize(this.state.beatType))} enroll ${
      window.location.protocol
    }//${window.location.host}${this.props.frameworkBasePath} ${this.props.enrollmentToken}`;

    return (
      <React.Fragment>
        {!this.state.enrolledBeat && (
          <React.Fragment>
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.beatsManagement.enrollBeat.beatTypeTitle"
                          defaultMessage="Beat type:"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSelect
                  value={this.state.beatType}
                  options={[
                    {
                      value: 'filebeat',
                      text: 'Filebeat',
                    },
                    {
                      value: 'metricbeat',
                      text: 'Metricbeat',
                    },
                  ]}
                  onChange={(e: any) => this.setState({ beatType: e.target.value })}
                  fullWidth={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <br />
            <br />
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xs">
                      <h3>
                        <FormattedMessage
                          id="xpack.beatsManagement.enrollBeat.platformTitle"
                          defaultMessage="Platform:"
                        />
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSelect
                  value={this.state.command}
                  options={[
                    {
                      value: `sudo {{beatType}}`,
                      text: 'DEB / RPM',
                    },
                    {
                      value: `PS C:\\Program Files\\{{beatTypeInCaps}}> {{beatType}}.exe`,
                      text: 'Windows',
                    },
                    {
                      value: `./{{beatType}}`,
                      text: 'MacOS',
                    },
                  ]}
                  onChange={(e: any) => this.setState({ command: e.target.value })}
                  fullWidth={true}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <br />
            <br />
            {this.state.command && (
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="flexEnd">
                    <EuiFlexItem grow={false}>
                      <EuiTitle size="xs">
                        <h3>
                          <FormattedMessage
                            id="xpack.beatsManagement.enrollBeat.yourBeatTypeHostTitle"
                            defaultMessage="On the host where your {beatType} is installed, run:"
                            values={{
                              beatType: capitalize(this.state.beatType),
                            }}
                          />
                        </h3>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem className="homTutorial__instruction" grow={false}>
                      <EuiCopy textToCopy={cmdText}>
                        {(copy: any) => (
                          <EuiButton size="s" onClick={copy}>
                            <FormattedMessage
                              id="xpack.beatsManagement.enrollBeat.copyButtonLabel"
                              defaultMessage="Copy command"
                            />
                          </EuiButton>
                        )}
                      </EuiCopy>
                    </EuiFlexItem>
                  </EuiFlexGroup>

                  <div className="eui-textBreakAll">
                    <EuiSpacer size="m" />
                    <EuiCodeBlock language="sh">{`$ ${cmdText}`}</EuiCodeBlock>
                  </div>

                  <EuiSpacer size="m" />

                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiFlexGroup gutterSize="s" alignItems="center">
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xs">
                            <h3>
                              <FormattedMessage
                                id="xpack.beatsManagement.enrollBeat.waitingBeatTypeToEnrollTitle"
                                defaultMessage="Waiting for {beatType} to enroll…"
                                values={{
                                  beatType: capitalize(this.state.beatType),
                                }}
                              />
                            </h3>
                          </EuiTitle>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                  <br />
                  <EuiLoadingSpinner size="l" />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </React.Fragment>
        )}
        {this.state.enrolledBeat && (
          <EuiModalBody>
            <FormattedMessage
              id="xpack.beatsManagement.enrollBeat.beatEnrolledTitle"
              defaultMessage="The Beat is now enrolled in central management:"
            />
            <br />
            <br />
            <br />
            <EuiBasicTable
              items={[this.state.enrolledBeat]}
              columns={[
                {
                  field: 'type',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.beatTypeColumnName"
                      defaultMessage="Beat Type"
                    />
                  ),
                  sortable: false,
                },
                {
                  field: 'version',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.versionColumnName"
                      defaultMessage="Version"
                    />
                  ),
                  sortable: false,
                },
                {
                  field: 'host_name',
                  name: (
                    <FormattedMessage
                      id="xpack.beatsManagement.enrollBeat.hostnameColumnName"
                      defaultMessage="Hostname"
                    />
                  ),
                  sortable: false,
                },
              ]}
            />
            <br />
            <br />
          </EuiModalBody>
        )}
      </React.Fragment>
    );
  }
}
