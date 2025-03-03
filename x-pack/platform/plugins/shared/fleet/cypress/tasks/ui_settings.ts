/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request } from './common';

// Create a Fleet server policy
export function setUISettings(settingsKey: string, settingsValue: any) {
  request({
    method: 'POST',
    url: '/internal/kibana/settings',
    headers: { 'kbn-xsrf': 'xx' },
    body: {
      changes: {
        [settingsKey]: settingsValue,
      },
    },
  });
}
