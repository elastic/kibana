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
import { CanvasEmptyState } from './canvas_empty_state';
import { CanvasReadOnlyProvider } from './canvas_read_only_context';

describe('CanvasEmptyState', () => {
  it('asks a manager to add a source', async () => {
    const onAddSource = jest.fn();
    render(
      <I18nProvider>
        <CanvasEmptyState onAddSource={onAddSource} />
      </I18nProvider>
    );

    await userEvent.click(screen.getByTestId('streamsCanvasEmptyStateAddSource'));

    expect(onAddSource).toHaveBeenCalledTimes(1);
  });

  it('shows only the text to a read-only user', () => {
    render(
      <I18nProvider>
        <CanvasReadOnlyProvider value={true}>
          <CanvasEmptyState onAddSource={jest.fn()} />
        </CanvasReadOnlyProvider>
      </I18nProvider>
    );

    expect(screen.getByText('See how your data flows in')).toBeInTheDocument();
    expect(screen.queryByTestId('streamsCanvasEmptyStateAddSource')).not.toBeInTheDocument();
  });
});
