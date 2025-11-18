/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('deprecations', () => {
  it('renames xpack.alerting.maintenanceWindow.enabled to xpack.maintenanceWindows.enabled', async () => {
    const config = {
      kibana: {
        alerting: {
          maintenanceWindow: {
            enabled: true,
          },
        },
      },
    };
  });
});
