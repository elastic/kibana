/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { SameFamily } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';
import { SAME_FAMILY } from './translations';

describe('SameFamily', () => {
  test('it renders a badge with the expected content', () => {
    render(
      <TestProviders>
        <SameFamily />
      </TestProviders>
    );

    expect(screen.getByTestId('sameFamily')).toHaveTextContent(SAME_FAMILY);
  });
});
