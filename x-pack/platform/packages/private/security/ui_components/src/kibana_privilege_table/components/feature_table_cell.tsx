/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

import type { SecuredFeature } from '@kbn/security-role-management-model';

interface Props {
  feature: SecuredFeature;
  hasSubFeaturePrivileges?: boolean;
}

export const FeatureTableCell = ({ feature, hasSubFeaturePrivileges }: Props) => {
  const { euiTheme } = useEuiTheme();
  let tooltipElement = null;
  if (feature.getPrivilegesTooltip()) {
    const tooltipContent = (
      <EuiText>
        <p>{feature.getPrivilegesTooltip()}</p>
      </EuiText>
    );
    tooltipElement = (
      <EuiIconTip
        iconProps={{
          className: 'eui-alignTop',
        }}
        type={'info'}
        color={'subdued'}
        content={tooltipContent}
      />
    );
  }

  return (
    <EuiFlexGroup
      css={
        !hasSubFeaturePrivileges &&
        css`
          margin-left: calc(${euiTheme.size.l} + ${euiTheme.size.xs});
        `
      }
      direction="column"
      gutterSize="none"
      component="span"
    >
      <EuiFlexItem data-test-subj={`featureTableCell`} component="span">
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem
            css={css`
              &:hover,
              &:focus {
                text-decoration: underline;
              }
            `}
            grow={false}
          >
            {feature.name}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{tooltipElement}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {feature.description && (
        <EuiFlexItem>
          <EuiText
            color="subdued"
            size="xs"
            data-test-subj="featurePrivilegeDescriptionText"
            aria-describedby={`${feature.name} description text`}
          >
            {feature.description}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
