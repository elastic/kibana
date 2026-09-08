/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

import type { CollectionVariant } from '../card_utils';
import { VariantRow } from './variant_row';

const makeVariant = (overrides: Partial<CollectionVariant> = {}): CollectionVariant => ({
  id: 'nginx',
  title: 'Nginx',
  description: 'The Nginx integration.',
  icon: <span data-test-subj="icon" />,
  href: '/app/integrations/detail/nginx-1.0/overview',
  ...overrides,
});

function renderVariantRow(variant: CollectionVariant) {
  return render(
    <I18nProvider>
      <EuiThemeProvider>
        <VariantRow variant={variant} />
      </EuiThemeProvider>
    </I18nProvider>
  );
}

describe('VariantRow', () => {
  it('renders the variant title', () => {
    const { getByText } = renderVariantRow(makeVariant());
    expect(getByText('Nginx')).toBeInTheDocument();
  });

  it('renders the variant description', () => {
    const { getByText } = renderVariantRow(makeVariant());
    expect(getByText('The Nginx integration.')).toBeInTheDocument();
  });

  it('renders a link when href is provided', () => {
    const { container } = renderVariantRow(makeVariant());
    const anchor = container.querySelector('a');
    expect(anchor).toHaveAttribute('href', '/app/integrations/detail/nginx-1.0/overview');
  });

  it('forwards the data-test-subj attribute', () => {
    const { container } = renderVariantRow(
      makeVariant({ 'data-test-subj': 'collectionVariantRow-nginx' })
    );
    expect(container.querySelector('[data-test-subj="collectionVariantRow-nginx"]')).toBeTruthy();
  });
});
