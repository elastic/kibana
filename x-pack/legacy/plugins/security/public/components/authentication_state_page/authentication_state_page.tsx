/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import React, { Component } from 'react';

interface Props {
  title: React.ReactNode;
}

export class AuthenticationStatePage extends Component<Props, {}> {
  public render() {
    return (
      <div className="secAuthenticationStatePage">
        <header className="secAuthenticationStatePage__header">
          <div className="secAuthenticationStatePage__content eui-textCenter">
            <EuiSpacer size="xxl" />
            <span className="secAuthenticationStatePage__logo">
              <EuiIcon type="logoKibana" size="xxl" />
            </span>
            <EuiTitle size="l" className="secAuthenticationStatePage__title">
              <h1>{this.props.title}</h1>
            </EuiTitle>
            <EuiSpacer size="xl" />
          </div>
        </header>
        <div className="secAuthenticationStatePage__content eui-textCenter">
          {this.props.children}
        </div>
      </div>
    );
  }
}
