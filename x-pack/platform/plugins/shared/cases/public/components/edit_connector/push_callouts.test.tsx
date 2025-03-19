/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { PushCallouts } from './push_callouts';
import { renderWithTestingProviders } from '../../common/mock';

const onEditClick = jest.fn();

const defaultProps = {
  hasConnectors: false,
  hasLicenseError: false,
  errorsMsg: [{ id: 'test-id', title: 'My title', description: 'My desc' }],
  onEditClick,
};

// Failing: See https://github.com/elastic/kibana/issues/206367
describe('PushCallouts ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    renderWithTestingProviders(<PushCallouts {...defaultProps} />);

    expect(await screen.findByText('My title')).toBeInTheDocument();
    expect(await screen.findByText('My desc')).toBeInTheDocument();
  });
});
