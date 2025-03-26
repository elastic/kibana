/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ConfigEditorFlyout } from './config_editor_flyout';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { FILTERS_FORM_SUBJ } from '@kbn/response-ops-alerts-filters-form/constants';

const core = coreMock.createStart();
core.http.get.mockResolvedValue([]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('ConfigEditorFlyout', () => {
  afterEach(() => {
    queryClient.clear();
  });

  it('should not render the filters form while loading rule types', () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout onSave={jest.fn()} onCancel={jest.fn()} services={core} />
        </QueryClientProvider>
      </IntlProvider>
    );
    expect(screen.queryByTestId(FILTERS_FORM_SUBJ)).not.toBeInTheDocument();
  });

  it("should disable the filters form if a solution wasn't chosen", async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout onSave={jest.fn()} onCancel={jest.fn()} services={core} />
        </QueryClientProvider>
      </IntlProvider>
    );
    const form = await screen.findByTestId(FILTERS_FORM_SUBJ);
    const formControls = within(form).getAllByRole('button');
    formControls.forEach((control) => expect(control).toBeDisabled());
  });
});
