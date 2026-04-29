/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import type { Props } from './searchprofiler_tabs';
import { SearchProfilerTabs } from './searchprofiler_tabs';

describe('Search Profiler Tabs', () => {
  it('renders', () => {
    const props: Props = {
      activateTab: () => {},
      activeTab: null,
      has: {
        aggregations: true,
        searches: true,
      },
    };

    render(<SearchProfilerTabs {...props} />);

    expect(screen.getByTestId('queryProfileTab')).toBeInTheDocument();
    expect(screen.getByTestId('aggregationProfileTab')).toBeInTheDocument();
  });
});
