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
  it('renders no badges when there are no fields', () => {
    render(<AlertEpisodeGroupingFields fields={[]} />);
    expect(screen.queryByText(/.+/)).not.toBeInTheDocument();
  });

  it('renders field names as badges', () => {
    render(<AlertEpisodeGroupingFields fields={['host.name', 'service.name']} />);
    expect(screen.getByText('host.name')).toBeInTheDocument();
    expect(screen.getByText('service.name')).toBeInTheDocument();
  });

  it('forwards data-test-subj to the badges row', () => {
    render(<AlertEpisodeGroupingFields fields={['a']} data-test-subj="groupingFieldsTest" />);
    expect(screen.getByTestId('groupingFieldsTest')).toBeInTheDocument();
  });
});
