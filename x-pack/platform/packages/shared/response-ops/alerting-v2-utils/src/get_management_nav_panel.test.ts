/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingV2ManagementNavPanel } from './get_management_nav_panel';

describe('getAlertingV2ManagementNavPanel', () => {
  it('returns a single panelOpener with the canonical children', () => {
    const result = getAlertingV2ManagementNavPanel();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'alerting_v2_panel',
      title: 'Alerting V2 Preview',
      children: [
        { link: 'management:rules' },
        { link: 'management:episodes' },
        { link: 'management:action_policies' },
        { link: 'management:execution_history' },
      ],
    });
  });
});
