/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiToolTipProps } from '@elastic/eui';
import { EuiToolTip } from '@elastic/eui';
import type { ReactElement } from 'react';
import React from 'react';

interface Props {
  children: ReactElement<any>;
  tooltipContent?: EuiToolTipProps['content'];
}
export const OptionalToolTip = (props: Props) => {
  if (props.tooltipContent) {
    return <EuiToolTip content={props.tooltipContent}>{props.children}</EuiToolTip>;
  }
  return props.children;
};
