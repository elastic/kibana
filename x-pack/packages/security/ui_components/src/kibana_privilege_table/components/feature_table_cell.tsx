/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './feature_table_cell.scss';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiText } from '@elastic/eui';
import React from 'react';

import type { SecuredFeature } from '@kbn/security-role-management-model';

interface Props {
  feature: SecuredFeature;
  className?: string;
}

export const FeatureTableCell = ({ feature, className }: Props) => {
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
        type={'iInCircle'}
        color={'subdued'}
        content={tooltipContent}
      />
    );
  }

  return (
    <EuiFlexGroup className={className} direction="column" gutterSize="none" component="span">
      <EuiFlexItem data-test-subj={`featureTableCell`} component="span">
        <EuiFlexGroup gutterSize="xs">
          <EuiFlexItem className="featurePrivilegeName" grow={false}>
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
