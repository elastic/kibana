/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { DistributionBar } from '..';

describe('DistributionBar', () => {
  it('should render', () => {
    const stats = [
      {
        key: 'passed',
        count: 90,
        color: 'green',
      },
      {
        key: 'failed',
        count: 10,
        color: 'red',
      },
    ];

    const { container } = render(<DistributionBar stats={stats} />);
    expect(container).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toEqual(stats.length);
  });

  it('should render empty bar', () => {
    const { container } = render(
      <DistributionBar data-test-subj={'distribution-bar'} stats={[]} />
    );
    expect(container).toBeInTheDocument();
    expect(container.querySelectorAll('span').length).toEqual(1);
    expect(
      container.querySelector('[data-test-subj="distribution-bar__emptyBar"]')
    ).toBeInTheDocument();
  });
});
