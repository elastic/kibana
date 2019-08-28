/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiContextMenuItem, EuiContextMenuPanel, EuiLink, EuiPopover } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import _ from 'lodash';
import React, { Component } from 'react';
interface Props {
  onChange: (privilege: string) => void;
  privileges: string[];
  disabled?: boolean;
}

interface State {
  isPopoverOpen: boolean;
}

export class ChangeAllPrivilegesControl extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  public render() {
    const button = (
      <EuiLink onClick={this.onButtonClick} className={'secPrivilegeFeatureChangeAllLink'}>
        <FormattedMessage
          id="xpack.security.management.editRole.changeAllPrivilegesLink"
          defaultMessage="(change all)"
        />
      </EuiLink>
    );

    const items = this.props.privileges.map(privilege => {
      return (
        <EuiContextMenuItem
          key={privilege}
          onClick={() => {
            this.onSelectPrivilege(privilege);
          }}
          disabled={this.props.disabled}
        >
          {_.capitalize(privilege)}
        </EuiContextMenuItem>
      );
    });

    return (
      <EuiPopover
        id={'changeAllFeaturePrivilegesPopover'}
        button={button}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        panelPaddingSize="none"
        anchorPosition="downLeft"
      >
        <EuiContextMenuPanel items={items} />
      </EuiPopover>
    );
  }

  private onSelectPrivilege = (privilege: string) => {
    this.props.onChange(privilege);
    this.setState({ isPopoverOpen: false });
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };
}
