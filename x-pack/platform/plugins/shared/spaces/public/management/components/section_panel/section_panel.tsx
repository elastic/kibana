/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { EuiFlexGroup, EuiIcon, EuiPanel, EuiSpacer, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { Component, Fragment } from 'react';

interface Props {
  iconType?: IconType;
  title?: string | ReactNode;
  dataTestSubj?: string;
}

const SectionPanelTitle = ({
  iconType,
  title,
}: {
  iconType?: IconType;
  title: string | ReactNode;
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup alignItems={'baseline'} gutterSize="s" responsive={false}>
      <EuiTitle size="s">
        <h2>
          {iconType && (
            <Fragment>
              <EuiIcon
                type={iconType}
                size={'xl'}
                css={css`
                  vertical-align: text-bottom;
                  margin-right: ${euiTheme.size.s};
                `}
              />
            </Fragment>
          )}
          {title}
        </h2>
      </EuiTitle>
    </EuiFlexGroup>
  );
};

export class SectionPanel extends Component<React.PropsWithChildren<Props>, {}> {
  public render() {
    return (
      <EuiPanel hasShadow={false} hasBorder={true} data-test-subj={this.props.dataTestSubj}>
        {this.getTitle()}
        {this.getForm()}
      </EuiPanel>
    );
  }

  public getTitle = () => {
    if (!this.props.title) {
      return null;
    }

    return <SectionPanelTitle iconType={this.props.iconType} title={this.props.title as string} />;
  };

  public getForm = () => {
    return (
      <Fragment>
        {this.props.title ? <EuiSpacer /> : null}
        {this.props.children}
      </Fragment>
    );
  };
}
