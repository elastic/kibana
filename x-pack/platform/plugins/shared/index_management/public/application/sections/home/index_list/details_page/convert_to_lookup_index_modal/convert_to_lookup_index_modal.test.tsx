/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';

import { ConvertToLookupIndexModal } from './convert_to_lookup_index_modal';

const defaultProps = {
  onCloseModal: jest.fn(),
  onConvert: jest.fn(),
  indexName: 'my-index',
};

describe('ConvertToLookupIndexModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal', () => {
    const { getByTestId } = render(
      <IntlProvider>
        <ConvertToLookupIndexModal {...defaultProps} />
      </IntlProvider>
    );

    expect(getByTestId('convertToLookupIndexModal')).toBeInTheDocument();
  });
});
