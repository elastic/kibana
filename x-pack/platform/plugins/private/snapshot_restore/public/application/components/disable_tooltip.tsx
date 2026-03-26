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
  /** Tooltip anchor element  */
  children: ReactElement;
}

export const DisableToolTip = ({ isManaged, tooltipMessage, children, ...props }: Props) => {
  // Ensures that any implicitly passed down props from meta parent component via `cloneElement` like in EuiFormRow [here](https://github.com/elastic/eui/blob/bc9c0a0b3faab449f88e45a588dfe0a53d842cf7/packages/eui/src/components/form/form_row/form_row.tsx#L210-L213) are forwarded down to anchor element.
  // At the same time, explicitly provided props on anchor component, should always take precedence to avoid confusion.
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
