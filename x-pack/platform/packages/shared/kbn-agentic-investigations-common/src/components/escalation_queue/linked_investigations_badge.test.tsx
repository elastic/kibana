/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { LinkedInvestigationsBadge } from './linked_investigations_badge';

describe('LinkedInvestigationsBadge', () => {
  it('displays the count', () => {
    renderWithKibanaRenderContext(<LinkedInvestigationsBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays 0 when count is 0', () => {
    renderWithKibanaRenderContext(<LinkedInvestigationsBadge count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders with tabIndex so the tooltip is keyboard accessible', () => {
    const { container } = renderWithKibanaRenderContext(<LinkedInvestigationsBadge count={3} />);
    const badge = container.querySelector('[tabindex="0"]');
    expect(badge).not.toBeNull();
  });
});
