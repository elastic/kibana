/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '../types';
import { attachmentDataToDashboardState } from './from_attachment';

describe('attachmentDataToDashboardState', () => {
  it('leaves the time range and refresh interval unset when the attachment has none, so applying it keeps the dashboard ones', () => {
    const state = attachmentDataToDashboardState({ title: 'Logs', panels: [] });

    expect(state).not.toHaveProperty('time_range');
    expect(state).not.toHaveProperty('refresh_interval');
  });

  it('keeps the time range and refresh interval of the attachment', () => {
    const data = {
      title: 'Logs',
      panels: [],
      time_range: { from: 'now-7d', to: 'now' },
      refresh_interval: { pause: false, value: 60000 },
    } as DashboardAttachmentData;

    const state = attachmentDataToDashboardState(data);

    expect(state.time_range).toEqual({ from: 'now-7d', to: 'now' });
    expect(state.refresh_interval).toEqual({ pause: false, value: 60000 });
  });
});
