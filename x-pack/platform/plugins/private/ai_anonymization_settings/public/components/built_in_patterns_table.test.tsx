/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { RegexAnonymizationRule } from '@kbn/ai-anonymization-common';
import { BuiltInPatternsTable } from './built_in_patterns_table';

jest.mock('../hooks/use_pattern_tester', () => ({
  usePatternTester: () => ({
    test: jest.fn(),
    result: {
      maskedInput: { 'builtin-long': 'HOST_NAME_c149b11fb2b78fc39be80c6f5612b8a6219a4d75' },
    },
    isLoading: false,
  }),
}));

const LONG_PATTERN = `\\b(?:[a-zA-Z0-9]{1,63}\\.){2,10}(?:${'internal|'.repeat(40)}local)\\b`;

const patterns: RegexAnonymizationRule[] = [
  {
    type: 'RegExp',
    id: 'builtin-long',
    name: 'Long pattern',
    entityClass: 'HOST_NAME',
    pattern: LONG_PATTERN,
    enabled: true,
    builtIn: true,
  },
];

const renderTable = () =>
  render(
    <I18nProvider>
      <BuiltInPatternsTable patterns={patterns} onToggle={jest.fn()} isSavingEnabled={true} />
    </I18nProvider>
  );

describe('BuiltInPatternsTable', () => {
  it('shows each built-in rule’s regex in a Pattern column', () => {
    renderTable();

    expect(screen.getByRole('columnheader', { name: 'Pattern' })).toBeInTheDocument();
    expect(screen.getByText(LONG_PATTERN)).toBeInTheDocument();
  });

  it('reveals the full regex in a tooltip on hover, since the cell itself is truncated', async () => {
    renderTable();

    await userEvent.hover(screen.getByText(LONG_PATTERN));

    // One copy in the (visually truncated) cell, one in the tooltip.
    expect(await screen.findAllByText(LONG_PATTERN)).toHaveLength(2);
  });

  it('truncates the example output token and reveals the whole token on hover', async () => {
    renderTable();
    const token = 'HOST_NAME_c149b11fb2b78fc39be80c6f5612b8a6219a4d75';

    const cell = screen.getByText(token);
    expect(cell).toHaveStyleRule('text-overflow', 'ellipsis');
    expect(cell).toHaveStyleRule('white-space', 'nowrap');

    await userEvent.hover(cell);

    // One copy in the (visually truncated) cell, one in the tooltip.
    expect(await screen.findAllByText(token)).toHaveLength(2);
  });
});
