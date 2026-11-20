/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen, within } from '@testing-library/react';
import React from 'react';
import { LearnMorePanel } from './learn_more_panel';

const docLinks = {
  overview: 'https://docs/context-engine',
  aiIndices: 'https://docs/concepts#ai-indices',
  sources: 'https://docs/concepts#sources',
  memory: 'https://docs/concepts#memory',
};

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: { docLinks: { links: { contextEngine: docLinks } } },
  }),
}));

describe('LearnMorePanel', () => {
  it.each([
    ['aiIndices', 'What is an AI index', docLinks.aiIndices],
    ['sources', 'Add sources', docLinks.sources],
    ['memory', 'How memory works', docLinks.memory],
  ])('links the %s card to the docs in a new tab', (id, title, href) => {
    render(
      <I18nProvider>
        <EuiProvider>
          <LearnMorePanel />
        </EuiProvider>
      </I18nProvider>
    );

    const card = screen.getByTestId(`contextOverviewLearnMoreCard-${id}`);
    expect(card).toHaveTextContent(title);
    const link = within(card).getByRole('link');
    expect(link).toHaveAttribute('href', href);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAccessibleName(`${title} (opens in a new tab or window)`);
  });
});
