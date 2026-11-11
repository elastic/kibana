/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { ScopedHistory } from '@kbn/core/public';
import { EvalsApp } from './application';

jest.mock('./pages/online_evals_list', () => ({
  OnlineEvalsListPage: () => <div>Online evals list</div>,
}));

describe('EvalsApp', () => {
  it('keeps the online evaluations route available without showing a navigation tab', () => {
    const history = createMemoryHistory({
      initialEntries: ['/online'],
    }) as unknown as ScopedHistory;

    render(
      <EvalsApp
        history={history}
        setBreadcrumbs={jest.fn()}
        getHref={(path) => path}
        breadcrumbPrefix={[]}
      />
    );

    expect(screen.getByText('Online evals list')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Online Evaluations' })).not.toBeInTheDocument();
  });
});
