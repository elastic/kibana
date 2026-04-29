/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';

import { renderWithTestingProviders } from '../../common/mock';
import { CaseCallouts } from './case_callouts';

describe('CaseCallouts ', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', () => {
    renderWithTestingProviders(<CaseCallouts />);
    expect(screen.getByTestId('case-callouts')).toBeInTheDocument();
  });

  it('shows the platinum license callout if the user has less than platinum license', () => {
    renderWithTestingProviders(<CaseCallouts />);
    expect(screen.getByTestId('case-callout-license-info')).toBeInTheDocument();
  });

  it('does not show the platinum license callout if the user has platinum license', () => {
    const license = licensingMock.createLicense({
      license: { type: 'platinum' },
    });

    renderWithTestingProviders(<CaseCallouts />, { wrapperProps: { license } });

    expect(screen.queryByTestId('case-callout-license-info')).toBeNull();
  });
});
