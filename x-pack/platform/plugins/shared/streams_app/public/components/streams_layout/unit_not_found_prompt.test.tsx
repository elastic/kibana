/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { UnitNotFoundPrompt } from './unit_not_found_prompt';

jest.mock('../../hooks/use_streams_app_router', () => ({
  useStreamsAppRouter: () => ({ link: (path: string) => path }),
}));

describe('UnitNotFoundPrompt', () => {
  it('names the missing unit and links back to Streams', () => {
    render(
      <I18nProvider>
        <UnitNotFoundPrompt unitId="edge" />
      </I18nProvider>
    );

    const prompt = screen.getByTestId('streamsUnitNotFoundPrompt');
    expect(prompt).toHaveTextContent('Unit not found');
    expect(prompt).toHaveTextContent('We could not find unit edge.');
    const backButton = screen.getByTestId('streamsUnitNotFoundBackButton');
    expect(backButton).toHaveAttribute('href', '/v2');
    expect(backButton).toHaveTextContent('Go to Streams');
  });
});
