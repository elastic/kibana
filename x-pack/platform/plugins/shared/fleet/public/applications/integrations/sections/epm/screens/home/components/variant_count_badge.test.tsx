/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { VariantCountBadge } from './variant_count_badge';

describe('VariantCountBadge', () => {
  it('renders the singular label for count=1', () => {
    const { getByText } = render(
      <I18nProvider>
        <VariantCountBadge count={1} />
      </I18nProvider>
    );
    expect(getByText('1 variant')).toBeInTheDocument();
  });

  it('renders the plural label for count > 1', () => {
    const { getByText } = render(
      <I18nProvider>
        <VariantCountBadge count={3} />
      </I18nProvider>
    );
    expect(getByText('3 variants')).toBeInTheDocument();
  });
});
