/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode, memo } from 'react';
import { EuiTitle } from '@elastic/eui';

interface ActionBarStatusItemProps {
  title: string | ReactNode;
  children?: ReactNode;
  dataTestSubj?: string;
}

const ActionBarStatusItemComponent: React.FC<ActionBarStatusItemProps> = ({
  title,
  children,
  dataTestSubj,
}) => (
  <>
    <EuiTitle size="xxs" data-test-subj={dataTestSubj}>
      <strong>{title}</strong>
    </EuiTitle>
    {children}
  </>
);

ActionBarStatusItemComponent.displayName = 'ActionBarStatusItem';

export const ActionBarStatusItem = memo(ActionBarStatusItemComponent);
