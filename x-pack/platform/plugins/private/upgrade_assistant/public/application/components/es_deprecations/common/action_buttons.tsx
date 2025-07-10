/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiLink } from '@elastic/eui';

export interface ActionButtonConfig {
  tooltip: string;
  iconType: string;
  canDisplay: boolean;
  resolutionType: string;
  onClick: () => void;
}

export const ActionButtons: React.FunctionComponent<{
  actions: ActionButtonConfig[];
  dataTestSubjPrefix: string;
}> = ({ actions, dataTestSubjPrefix }) => (
  <EuiFlexGroup gutterSize="s" alignItems="center">
    {actions
      .filter((action) => action.canDisplay)
      .map((action) => (
        <EuiFlexItem grow={false} key={action.resolutionType}>
          <EuiToolTip position="top" content={action.tooltip}>
            <EuiLink
              onClick={action.onClick}
              data-test-subj={`deprecation-${dataTestSubjPrefix}-${action.resolutionType}`}
            >
              <EuiIcon
                color={action.iconType === 'trash' ? 'danger' : 'primary'}
                type={action.iconType}
                size="m"
                aria-label={action.tooltip}
              />
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
  </EuiFlexGroup>
);
