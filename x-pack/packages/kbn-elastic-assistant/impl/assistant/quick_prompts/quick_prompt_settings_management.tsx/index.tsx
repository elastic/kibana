/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { QuickPrompt } from '../types';

interface Props {
  quickPrompts: QuickPrompt[];
}
const QuickPromptSettingsManagementComponent = ({quickPrompts}: Props) => {
  cosnt columns = [
    {
      field: 'title',
      name: 'Title',
    }
  ];
  return (
    <div>
      <EuiInMemoryTable pagination columns={columns} items={quickPromptSettings} />
    </div>
  );
};

export const QuickPromptSettingsManagement = QuickPromptSettingsManagementComponent;
