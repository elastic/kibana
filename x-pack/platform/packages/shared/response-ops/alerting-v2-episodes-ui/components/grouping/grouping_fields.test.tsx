/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertEpisodeGroupingFields } from './grouping_fields';

describe('AlertEpisodeGroupingFields', () => {
  it('renders hollow badges for each grouping field', () => {
    render(<AlertEpisodeGroupingFields fields={['host.name', 'service.name']} />);
    const host = screen.getByText('host.name');
    const service = screen.getByText('service.name');
    expect(host).toHaveAttribute('class', expect.stringContaining('euiBadge'));
    expect(service).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders no badges when there are no fields', () => {
    const { container } = render(<AlertEpisodeGroupingFields fields={[]} />);
    expect(container.querySelector('.euiFlexGroup')).toBeInTheDocument();
    expect(container.querySelector('.euiBadge')).not.toBeInTheDocument();
  });

  it('forwards data-test-subj to the badges row', () => {
    render(<AlertEpisodeGroupingFields fields={['a']} data-test-subj="groupingFieldsTest" />);
    expect(screen.getByTestId('groupingFieldsTest')).toBeInTheDocument();
  });

  it('forwards data-test-subj to the empty wrapper', () => {
    render(<AlertEpisodeGroupingFields fields={[]} data-test-subj="groupingEmptyTest" />);
    expect(screen.getByTestId('groupingEmptyTest')).toBeInTheDocument();
  });
});
