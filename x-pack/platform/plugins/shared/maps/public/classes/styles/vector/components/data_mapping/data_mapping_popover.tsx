/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import React, { Component, ReactElement } from 'react';
import { EuiButtonEmpty, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

type Props = {
  children: ReactElement<any>;
};

type State = {
  isPopoverOpen: boolean;
};

export class DataMappingPopover extends Component<Props, State> {
  state = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  _renderButton() {
    return (
      <EuiButtonEmpty
        onClick={this._togglePopover}
        size="xs"
        iconType="controlsHorizontal"
        iconSide="left"
      >
        <FormattedMessage
          id="xpack.maps.styles.fieldMetaOptions.popoverToggle"
          defaultMessage="Data mapping"
        />
      </EuiButtonEmpty>
    );
  }

  render() {
    return (
      <EuiPopover
        id="dataMappingPopover"
        anchorPosition="leftCenter"
        button={this._renderButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        ownFocus
      >
        {this.props.children}
      </EuiPopover>
    );
  }
}
