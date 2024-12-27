/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

export const HelpIcon: FC<{ content: ReactNode | string }> = ({ content }) => {
  return (
    <EuiToolTip position="top" content={content}>
      <EuiIcon type="questionInCircle" color={'subdued'} className="eui-alignTop" size="s" />
    </EuiToolTip>
  );
};
