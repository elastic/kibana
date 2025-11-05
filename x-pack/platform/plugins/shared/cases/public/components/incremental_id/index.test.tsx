/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithTestingProviders } from '../../common/mock';
import { screen } from '@testing-library/react';
import { IncrementalIdText } from '.';

describe('IncrementalIdText', () => {
  it('renders the incremental id', () => {
    renderWithTestingProviders(<IncrementalIdText incrementalId={1337} />);
    expect(screen.getByTestId('cases-incremental-id-text')).toHaveTextContent('#1337');
  });
});
