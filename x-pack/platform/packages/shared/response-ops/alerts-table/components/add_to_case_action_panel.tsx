/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React from 'react';

export interface AddToCaseAction {
  id: string;
  label: string;
  onClick: () => void;
  dataTestSubj?: string;
  disabled?: boolean;
}

interface AddToCaseActionPanelProps {
  actions: AddToCaseAction[];
}

export const AddToCaseActionPanel = ({ actions }: AddToCaseActionPanelProps) => (
  <>
    {actions.map(({ id, label, onClick, dataTestSubj, disabled }) => (
      <EuiContextMenuItem
        key={id}
        data-test-subj={dataTestSubj}
        disabled={disabled}
        onClick={onClick}
      >
        {label}
      </EuiContextMenuItem>
    ))}
  </>
);
