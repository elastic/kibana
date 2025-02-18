/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const MANAGED_REPOSITORY_TOOLTIP_MESSAGE = i18n.translate(
  'xpack.snapshotRestore.repositoryForm.disableToolTip',
  {
    defaultMessage: 'This field is disabled because you are editing a managed repository.',
  }
);

export const MANAGED_POLICY_TOOLTIP_MESSAGE = i18n.translate(
  'xpack.snapshotRestore.policyForm.disableToolTip',
  {
    defaultMessage: 'This field is disabled because you are editing a managed policy.',
  }
);

interface Props {
  isManaged?: boolean;
  tooltipMessage: string;
  component: ReactElement;
}

/**
 * Component that wraps a given component (disabled field) with a tooltip if a repository
 * or policy is managed (isManaged === true).
 *
 * @param {boolean} isManaged - Determines if the tooltip should be displayed.
 * @param {string} tooltipMessage - The message to display inside the tooltip.
 * @param {React.ReactElement} component - The component to wrap with the tooltip.
 */
export const DisableToolTip: React.FunctionComponent<Props> = ({
  isManaged,
  tooltipMessage,
  component,
}) => {
  return isManaged ? (
    <EuiToolTip content={tooltipMessage} display="block">
      {component}
    </EuiToolTip>
  ) : (
    component
  );
};
