/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ON_CLICK_ROW } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { getUrlDrilldown } from './get_url_drilldown';
import { rowClickData } from './test/data';

const mockExternalUrl = {
  validateUrl: (url: string) => new URL(url),
  isInternalUrl: (_url: string) => false,
};

const createDrilldown = () =>
  getUrlDrilldown({
    externalUrl: mockExternalUrl,
    getGlobalScope: () => ({ kibanaUrl: 'http://localhost:5601/' }),
    navigateToUrl: jest.fn(),
    getSyntaxHelpDocsLink: () => 'http://localhost:5601/docs',
    getVariablesHelpDocsLink: () => 'http://localhost:5601/docs',
    settings: {} as any,
    theme: () => ({} as any),
  });

const mockContext = {
  embeddable: {},
  data: rowClickData,
  trigger: { id: ON_CLICK_ROW },
} as any;

describe('getUrlDrilldown MenuItem', () => {
  test('compiles label template with event variables', async () => {
    const drilldown = createDrilldown();
    const MenuItem = drilldown.action.MenuItem!;

    const drilldownState = {
      label: 'Go to URL {{event.values.[0]}}',
      trigger: ON_CLICK_ROW,
      type: 'URL_DRILLDOWN',
      url: 'https://example.com',
    } as any;

    const { getByText } = render(
      <MenuItem drilldownState={drilldownState} context={mockContext} />
    );

    // initially renders raw label
    expect(getByText('Go to URL {{event.values.[0]}}')).toBeInTheDocument();

    // after compile resolves, label is interpolated with event.values.[0] = 'IT'
    await waitFor(() => {
      expect(getByText('Go to URL IT')).toBeInTheDocument();
    });
  });

  test('renders raw label when template has no variables', async () => {
    const drilldown = createDrilldown();
    const MenuItem = drilldown.action.MenuItem!;

    const drilldownState = {
      label: 'Go to external site',
      trigger: ON_CLICK_ROW,
      type: 'URL_DRILLDOWN',
      url: 'https://example.com',
    } as any;

    const { getByText } = render(
      <MenuItem drilldownState={drilldownState} context={mockContext} />
    );

    await waitFor(() => {
      expect(getByText('Go to external site')).toBeInTheDocument();
    });
  });
});
