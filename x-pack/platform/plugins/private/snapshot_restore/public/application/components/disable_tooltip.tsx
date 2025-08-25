/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { cloneElement } from 'react';
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

/**
 * Component that wraps a given component (disabled field) with a tooltip if a repository
 * or policy is managed (isManaged === true).
 */
export interface Props {
  /** Determines if the tooltip should be displayed.
   *  @optional
   */
  isManaged?: boolean;
  /** The message to display inside the tooltip. */
  tooltipMessage: string;
  /** The component to wrap with the tooltip. */
  children: ReactElement;
}

export const DisableToolTip = ({ isManaged, tooltipMessage, children, ...props }: Props) => {
  // Ensures that any additional props passed down by EuiFormRow (e.g. id, aria-describedby) are forwarded to the wrapped component
  const childrenWithProps = cloneElement(children, {
    ...props,
    ...children.props,
  });

  return isManaged ? (
    <EuiToolTip content={tooltipMessage} display="block">
      {childrenWithProps}
    </EuiToolTip>
  ) : (
    childrenWithProps
  );
};
