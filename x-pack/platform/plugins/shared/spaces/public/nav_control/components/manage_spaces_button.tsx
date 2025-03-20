/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, withEuiTheme, type WithEuiThemeProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CSSProperties } from 'react';
import React, { Component } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  isDisabled?: boolean;
  className?: string;
  size?: 's' | 'm';
  style?: CSSProperties;
  onClick?: () => void;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
}

class ManageSpacesButtonUI extends Component<Props & WithEuiThemeProps, {}> {
  public render() {
    if (!this.props.capabilities.spaces.manage) {
      return null;
    }
    const { euiTheme } = this.props.theme;

    return (
      <EuiButton
        size={this.props.size || 's'}
        className={this.props.className}
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
        style={this.props.style}
        data-test-subj="manageSpaces"
        css={css`
          margin: ${euiTheme.size.m};
          width: calc(100% - ${euiTheme.size.m} * 2);
        `}
      >
        <FormattedMessage
          id="xpack.spaces.manageSpacesButton.manageSpacesButtonLabel"
          defaultMessage="Manage spaces"
        />
      </EuiButton>
    );
  }

  private navigateToManageSpaces = () => {
    if (this.props.onClick) {
      this.props.onClick();
    }

    this.props.navigateToApp('management', { path: 'kibana/spaces' });
  };
}

export const ManageSpacesButton = withEuiTheme(ManageSpacesButtonUI);
