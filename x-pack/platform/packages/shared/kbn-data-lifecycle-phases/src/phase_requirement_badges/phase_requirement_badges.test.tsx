/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import {
  DefaultRepositoryRequiredBadge,
  EnterpriseLicenseRequiredBadge,
} from './phase_requirement_badges';

describe('phase requirement badges', () => {
  it('renders EnterpriseLicenseRequiredBadge and calls onClick', () => {
    const onClick = jest.fn();

    renderWithI18n(<EnterpriseLicenseRequiredBadge onClick={onClick} />);

    expect(screen.getByText('Enterprise required')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Enterprise required'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders DefaultRepositoryRequiredBadge and calls onClick', () => {
    const onClick = jest.fn();

    renderWithI18n(<DefaultRepositoryRequiredBadge onClick={onClick} />);

    expect(screen.getByText('Default repository required')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Default repository required'));
    expect(onClick).toHaveBeenCalled();
  });
});
