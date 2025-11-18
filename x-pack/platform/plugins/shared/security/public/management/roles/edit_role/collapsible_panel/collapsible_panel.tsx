/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { Component, Fragment } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  iconType?: IconType;
  title: string | ReactNode;
  initiallyCollapsed?: boolean;
}

interface State {
  collapsed: boolean;
}

const CollapsiblePanelTitle = ({
  iconType,
  title,
  collapsed,
  toggleCollapsed,
}: {
  iconType?: IconType;
  title: string | ReactNode;
  collapsed?: boolean;
  toggleCollapsed?: () => void;
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle>
          <h2>
            {iconType && (
              <Fragment>
                <EuiIcon
                  type={iconType}
                  size="xl"
                  css={css`
                    margin-right: ${euiTheme.size.s};
                    vertical-align: text-bottom;
                  `}
                />{' '}
              </Fragment>
            )}
            {title}
          </h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink data-test-subj="showHidePrivilege" onClick={toggleCollapsed}>
          {collapsed ? (
            <FormattedMessage
              id="xpack.security.management.editRole.collapsiblePanel.showLinkText"
              defaultMessage="show"
            />
          ) : (
            <FormattedMessage
              id="xpack.security.management.editRole.collapsiblePanel.hideLinkText"
              defaultMessage="hide"
            />
          )}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export class CollapsiblePanel extends Component<React.PropsWithChildren<Props>, State> {
  public state = {
    collapsed: false,
  };

  constructor(props: Props) {
    super(props);
    this.state = {
      collapsed: props.initiallyCollapsed || false,
    };
  }

  public render() {
    return (
      <EuiPanel hasShadow={false} hasBorder={true}>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    return (
      <CollapsiblePanelTitle
        iconType={this.props.iconType}
        title={this.props.title}
        collapsed={this.state.collapsed}
        toggleCollapsed={this.toggleCollapsed}
      />
    );
  };

  public getForm = () => {
    if (this.state.collapsed) {
      return null;
    }

    return (
      <Fragment>
        <EuiSpacer />
        {this.props.children}
      </Fragment>
    );
  };

  public toggleCollapsed = () => {
    this.setState({
      collapsed: !this.state.collapsed,
    });
  };
}
