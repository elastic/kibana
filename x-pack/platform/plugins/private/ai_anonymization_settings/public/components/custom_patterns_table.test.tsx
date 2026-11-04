/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { CustomPatternsTable } from './custom_patterns_table';

const patterns: RegexAnonymizationRule[] = [
  {
    type: 'RegExp',
    id: 'custom-1',
    name: 'Employee ID',
    entityClass: 'MISC',
    pattern: 'EMP-\\d+',
    enabled: true,
    builtIn: false,
  },
  {
    type: 'RegExp',
    id: 'custom-2',
    name: 'Ticket number',
    entityClass: 'MISC',
    pattern: 'TCK-\\d+',
    enabled: false,
    builtIn: false,
  },
];

describe('CustomPatternsTable', () => {
  // Without a name a screen reader announces every row's switch as just "switch".
  it('names each row switch after its pattern so it can be told apart', () => {
    render(
      <I18nProvider>
        <CustomPatternsTable
          patterns={patterns}
          onToggle={jest.fn()}
          onEdit={jest.fn()}
          onDelete={jest.fn()}
          onAddClick={jest.fn()}
          isSavingEnabled={true}
        />
      </I18nProvider>
    );

    expect(screen.getByRole('switch', { name: 'Enable Employee ID' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Enable Ticket number' })).toBeInTheDocument();
  });
});
