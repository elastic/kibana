/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { InfoBadge } from './info_badge';

describe('Info badge', () => {
  it('should render no icon if no palette is passed', () => {
    const res = render(
      <InfoBadge title="my Title" dataView="dataView" index={0} data-test-subj-prefix="prefix" />
    );

    expect(res.queryByTestId('prefix-0-icon')).not.toBeInTheDocument();
    expect(res.queryByTestId('prefix-0-palette')).not.toBeInTheDocument();
  });

  it('should render an icon if a single palette color is passed over', () => {
    const res = render(
      <InfoBadge
        title="my Title"
        dataView="dataView"
        index={0}
        data-test-subj-prefix="prefix"
        palette={['red']}
      />
    );

    expect(res.queryByTestId('prefix-0-icon')).toBeInTheDocument();
    expect(res.queryByTestId('prefix-0-palette')).not.toBeInTheDocument();
  });

  it('should render both an icon an a palette indicator if multiple colors are passed over', () => {
    const res = render(
      <InfoBadge
        title="my Title"
        dataView="dataView"
        index={0}
        data-test-subj-prefix="prefix"
        palette={['red', 'blue']}
      />
    );

    expect(res.queryByTestId('prefix-0-icon')).toBeInTheDocument();
    expect(res.queryByTestId('prefix-0-palette')).toBeInTheDocument();
  });

  it('should render children as value when passed', () => {
    const res = render(
      <InfoBadge title="my Title" dataView="dataView" index={0} data-test-subj-prefix="prefix">
        <div>100%</div>
      </InfoBadge>
    );
    expect(res.getByText('100%')).toBeInTheDocument();
  });
});
