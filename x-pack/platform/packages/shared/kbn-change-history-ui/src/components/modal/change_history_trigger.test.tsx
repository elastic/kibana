/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryProvider } from '../../provider/change_history_provider';
import type { ChangeHistoryAdapter } from '../../types/change_history_adapter';
import { ChangeHistoryTrigger } from './change_history_trigger';
import {
  TEST_CHANGE_HISTORY_SCOPE,
  TEST_OBJECT_ID,
  TEST_OBJECT_TITLE,
} from '../../test_utils/change_history_test_fixtures';
import { TestProvider } from '../../test_utils/test_providers';

const adapter: ChangeHistoryAdapter = {
  listChanges: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  getChange: jest.fn(),
};

const renderTrigger = (props: React.ComponentProps<typeof ChangeHistoryTrigger> = {}) =>
  render(
    <TestProvider>
      <ChangeHistoryProvider
        objectId={TEST_OBJECT_ID}
        adapter={adapter}
        labels={{ previewTitle: TEST_OBJECT_TITLE }}
        renderPreview={() => null}
        scope={TEST_CHANGE_HISTORY_SCOPE}
      >
        <ChangeHistoryTrigger {...props} />
      </ChangeHistoryProvider>
    </TestProvider>
  );

describe('ChangeHistoryTrigger', () => {
  it('renders an app header link', () => {
    renderTrigger();

    expect(screen.getByTestId('changeHistoryTrigger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
  });

  it('accepts custom label and test subj', () => {
    renderTrigger({
      label: 'History',
      'data-test-subj': 'customHistoryTrigger',
    });

    expect(screen.getByTestId('customHistoryTrigger')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
  });
});
