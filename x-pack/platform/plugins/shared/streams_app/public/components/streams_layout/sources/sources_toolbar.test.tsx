/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SourcesToolbar } from './sources_toolbar';

describe('SourcesToolbar', () => {
  it('wires search, refresh, and source creation actions', async () => {
    const onQueryChange = jest.fn();
    const onRefresh = jest.fn();
    const onAddSource = jest.fn();

    render(
      <SourcesToolbar
        query=""
        typeOptions={[]}
        statusOptions={[]}
        selectedTypes={[]}
        selectedStatuses={[]}
        isRefreshing={false}
        onQueryChange={onQueryChange}
        onSelectedTypesChange={jest.fn()}
        onSelectedStatusesChange={jest.fn()}
        onRefresh={onRefresh}
        onAddSource={onAddSource}
      />
    );

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search sources' }), {
      target: { value: 'otlp' },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Refresh sources' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add source' }));

    expect(onQueryChange).toHaveBeenCalledWith('otlp');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onAddSource).toHaveBeenCalledTimes(1);
  });
});
