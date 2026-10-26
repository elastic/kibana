/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { CollectionSizeBadge } from './collection_size_badge';

describe('CollectionSizeBadge', () => {
  it('renders the number of bundled services', () => {
    const { getByText } = render(
      <I18nProvider>
        <CollectionSizeBadge count={40} />
      </I18nProvider>
    );
    expect(getByText('Collection of 40')).toBeInTheDocument();
  });
});
