/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component, CSSProperties } from 'react';
import { Capabilities } from 'src/core/public';
import { getManageSpacesUrl } from '../lib/constants';

interface Props {
  isDisabled?: boolean;
  className?: string;
  size?: 's' | 'm';
  style?: CSSProperties;
  onClick?: () => void;
  capabilities: Capabilities;
}

export class ManageSpacesButton extends Component<Props, {}> {
  public render() {
    if (!this.props.capabilities.spaces.manage) {
      return null;
    }

    return (
      <EuiButton
        size={this.props.size || 's'}
        className={this.props.className}
        isDisabled={this.props.isDisabled}
        onClick={this.navigateToManageSpaces}
        style={this.props.style}
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
    window.location.replace(getManageSpacesUrl());
  };
}
