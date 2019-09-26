/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton } from '@elastic/eui';
import React, { Component } from 'react';
import { EnrollBeat } from '../../../components/enroll_beats';
import { AppPageProps } from '../../../frontend_types';

interface ComponentState {
  readyToContinue: boolean;
}

export class BeatsInitialEnrollmentPage extends Component<AppPageProps, ComponentState> {
  constructor(props: AppPageProps) {
    super(props);
    this.state = {
      readyToContinue: false,
    };
  }

  public onBeatEnrolled = () => {
    this.setState({
      readyToContinue: true,
    });
  };

  public createEnrollmentToken = async () => {
    const enrollmentToken = await this.props.libs.tokens.createEnrollmentTokens();
    this.props.setUrlState({
      enrollmentToken: enrollmentToken[0],
    });
  };

  public render() {
    return (
      <React.Fragment>
        <EnrollBeat
          frameworkBasePath={this.props.libs.framework.info.basePath}
          enrollmentToken={this.props.urlState.enrollmentToken || ''}
          getBeatWithToken={this.props.libs.beats.getBeatWithToken}
          createEnrollmentToken={this.createEnrollmentToken}
          onBeatEnrolled={this.onBeatEnrolled}
        />
        {this.state.readyToContinue && (
          <React.Fragment>
            <EuiButton
              size="s"
              color="primary"
              style={{ marginLeft: 10 }}
              onClick={async () => {
                this.props.goTo('/walkthrough/initial/tag');
              }}
            >
              Continue
            </EuiButton>
          </React.Fragment>
        )}
      </React.Fragment>
    );
  }
}
