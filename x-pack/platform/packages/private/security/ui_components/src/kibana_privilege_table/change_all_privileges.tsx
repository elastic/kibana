/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './change_all_privileges.scss';

import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import React, { Component } from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { KibanaPrivilege } from '@kbn/security-role-management-model';

import { NO_PRIVILEGE_VALUE } from '../constants';

interface Props {
  onChange: (privilege: string) => void;
  privileges: KibanaPrivilege[];
  disabled?: boolean;
}

interface State {
  isPopoverOpen: boolean;
}

export class ChangeAllPrivilegesControl extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  private getPrivilegeCopy = (privilege: string): { label?: string; icon?: string } => {
    switch (privilege) {
      case 'all':
        return {
          icon: 'documentEdit',
          label: i18n.translate(
            'xpack.security.management.editRole.changeAllPrivileges.allSelectionLabel',
            {
              defaultMessage: 'Grant full access for all',
            }
          ),
        };
      case 'read':
        return {
          icon: 'glasses',
          label: i18n.translate(
            'xpack.security.management.editRole.changeAllPrivileges.readSelectionLabel',
            {
              defaultMessage: 'Grant read access for all',
            }
          ),
        };
      case 'none':
        return {
          icon: 'trash',
          label: i18n.translate(
            'xpack.security.management.editRole.changeAllPrivileges.noneSelectionLabel',
            {
              defaultMessage: 'Revoke access to all',
            }
          ),
        };
      default:
        return {};
    }
  };

  public render() {
    const button = (
      <EuiLink
        onClick={this.onButtonClick}
        className={'secPrivilegeFeatureChangeAllLink'}
        data-test-subj="changeAllPrivilegesButton"
      >
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.security.management.editRole.changeAllPrivilegesLink"
            defaultMessage="Bulk actions"
          />{' '}
          <EuiIcon size="s" type="arrowDown" />
        </EuiText>
      </EuiLink>
    );

    const items = this.props.privileges.map((privilege) => {
      const { icon, label } = this.getPrivilegeCopy(privilege.id);
      return (
        <EuiContextMenuItem
          icon={icon}
          key={privilege.id}
          data-test-subj={`changeAllPrivileges-${privilege.id}`}
          onClick={() => {
            this.onSelectPrivilege(privilege.id);
          }}
          disabled={this.props.disabled}
        >
          {label}
        </EuiContextMenuItem>
      );
    });

    items.push(
      <EuiContextMenuItem
        icon={this.getPrivilegeCopy(NO_PRIVILEGE_VALUE).icon}
        key={NO_PRIVILEGE_VALUE}
        data-test-subj={`changeAllPrivileges-${NO_PRIVILEGE_VALUE}`}
        onClick={() => {
          this.onSelectPrivilege(NO_PRIVILEGE_VALUE);
        }}
        disabled={this.props.disabled}
        // @ts-expect-error leaving this here so that when https://github.com/elastic/eui/issues/8123 is fixed we remove this comment
        css={({ euiTheme }) => ({ color: euiTheme.colors.danger })}
      >
        {this.getPrivilegeCopy(NO_PRIVILEGE_VALUE).label}
      </EuiContextMenuItem>
    );

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
