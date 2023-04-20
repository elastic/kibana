/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiToolTip, EuiToolTipProps } from '@elastic/eui';

export type TooltipWrapperProps = Partial<Omit<EuiToolTipProps, 'content'>> & {
  tooltipContent: string;
  /** When the condition is truthy, the tooltip will be shown */
  condition: boolean;
};

export const TooltipWrapper: React.FunctionComponent<TooltipWrapperProps> = ({
  children,
  condition,
  tooltipContent,
  ...tooltipProps
}) => {
  return (
    <>
      {condition ? (
        <EuiToolTip content={tooltipContent} delay="long" {...tooltipProps}>
          <>{children}</>
        </EuiToolTip>
      ) : (
        children
      )}
    </>
  );
};
