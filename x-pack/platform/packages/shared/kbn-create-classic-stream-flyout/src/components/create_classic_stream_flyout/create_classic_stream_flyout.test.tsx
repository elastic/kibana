/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render } from '@testing-library/react';
import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const defaultProps = {
  onClose: jest.fn(),
  onCreate: jest.fn(),
};

const renderFlyout = () => {
  return render(
    <IntlProvider>
      <CreateClassicStreamFlyout {...defaultProps} />
    </IntlProvider>
  );
};

describe('CreateClassicStreamFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout with step navigation', () => {
    const { getByTestId } = renderFlyout();

    expect(getByTestId('create-classic-stream-flyout')).toBeInTheDocument();
    expect(getByTestId('createClassicStreamStep-selectTemplate')).toBeInTheDocument();
    expect(getByTestId('createClassicStreamStep-nameAndConfirm')).toBeInTheDocument();
  });
});
