/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiToolTip } from '@elastic/eui';
import React from 'react';

/**
 * Wrapper to display a tooltip if element is disabled (i.e. due to insufficient permissions)
 */
export const DisabledWrapperTooltip: React.FunctionComponent<{
  children: React.ReactElement;
  disabled: boolean;
  tooltipContent: React.ReactNode;
}> = ({ children, disabled, tooltipContent }) => {
  if (disabled) {
    return <EuiToolTip content={tooltipContent}>{children}</EuiToolTip>;
  } else {
    return <>{children}</>;
  }
};
