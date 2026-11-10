/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ComponentProps } from 'react';
import { render } from '@testing-library/react';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import { DashboardEmbedAttachment } from './dashboard_embed_attachment';

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: jest.fn(() => null),
}));

type EmbedProps = ComponentProps<typeof DashboardEmbedAttachment>;

const getInitialInput = async (config: Record<string, unknown>) => {
  const props = {
    attachmentId: 'dashboard-1',
    data: { config: { panels: [], ...config } },
  } as unknown as EmbedProps;
  render(<DashboardEmbedAttachment {...props} />);

  const [[{ getCreationOptions }]] = jest.mocked(DashboardRenderer).mock.calls;
  const creationOptions = await getCreationOptions?.();
  return creationOptions?.getInitialInput?.();
};

describe('DashboardEmbedAttachment', () => {
  beforeEach(() => jest.mocked(DashboardRenderer).mockClear());

  it('renders a dashboard without a time range over the last 24 hours', async () => {
    const initialInput = await getInitialInput({});

    expect(initialInput?.time_range).toEqual({ from: 'now-24h', to: 'now' });
  });

  it('renders the time range of the dashboard', async () => {
    const initialInput = await getInitialInput({ time_range: { from: 'now-7d', to: 'now' } });

    expect(initialInput?.time_range).toEqual({ from: 'now-7d', to: 'now' });
  });
});
