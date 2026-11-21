/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { RecommendedEndpointsList } from './recommended_endpoints_list';
import type { EndpointEfforts } from '../../types';
import type { EndpointDisplay } from './types';
import type { GlobalDefaultLockedRowProps } from './global_default_locked_row';

const endpointDisplayMap = new Map<string, EndpointDisplay>([
  ['ep-1', { icon: 'logoElastic', label: 'Claude' }],
  ['ep-3', { icon: 'logoOpenAI', label: 'GPT-4o' }],
]);

describe('RecommendedEndpointsList', () => {
  const renderList = ({
    endpointIds = ['ep-1'],
    efforts = {},
    invalidEndpointIds = new Set<string>(),
    globalDefaultRow,
  }: Partial<{
    endpointIds: string[];
    efforts: EndpointEfforts;
    invalidEndpointIds: Set<string>;
    globalDefaultRow: Omit<GlobalDefaultLockedRowProps, 'featureId'>;
  }> = {}) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <RecommendedEndpointsList
            featureId="test_feature"
            endpointIds={endpointIds}
            efforts={efforts}
            endpointDisplayMap={endpointDisplayMap}
            invalidEndpointIds={invalidEndpointIds}
            deprecatedEndpointsMap={new Map()}
            globalDefaultRow={globalDefaultRow}
          />
        </I18nProvider>
      </EuiThemeProvider>
    );

  it('renders a read-only row for each recommended endpoint', () => {
    renderList();

    expect(screen.getByTestId('endpoint-row-ep-1')).toBeInTheDocument();
    expect(screen.queryByTestId('remove-endpoint-ep-1')).not.toBeInTheDocument();
  });

  it('shows a focusable warning indicator for an invalid endpoint in the read-only recommended-defaults list', () => {
    renderList({ invalidEndpointIds: new Set(['ep-1']) });

    const row = screen.getByTestId('endpoint-row-ep-1');
    expect(row).toBeInTheDocument();
    // EuiIconTip renders its inner icon with tabIndex={0}; the normal aria-hidden icon has none.
    expect(row.querySelector('[tabindex="0"]')).not.toBeNull();
  });

  it('shows the recommended effort as read-only when using recommended defaults', () => {
    renderList({ efforts: { 'ep-1': 'low' } });

    expect(screen.getByTestId('effort-badge-ep-1')).toHaveTextContent('low');
    expect(screen.queryByTestId('add-effort-ep-1')).not.toBeInTheDocument();
  });

  it('renders the global default row when provided', () => {
    renderList({
      globalDefaultRow: {
        icon: 'logoOpenAI',
        label: 'GPT-4o',
        showBadge: true,
        globalDefaultId: 'ep-3',
      },
    });

    expect(screen.getByTestId('global-default-row-test_feature')).toBeInTheDocument();
  });

  it('does not render the global default row when not provided', () => {
    renderList();

    expect(screen.queryByTestId('global-default-row-test_feature')).not.toBeInTheDocument();
  });
});
