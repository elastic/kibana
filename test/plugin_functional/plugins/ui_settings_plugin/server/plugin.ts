/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Plugin, CoreSetup } from 'kibana/server';

export class UiSettingsPlugin implements Plugin {
  public setup(core: CoreSetup) {
    core.uiSettings.register({
      ui_settings_plugin: {
        name: 'from_ui_settings_plugin',
        description: 'just for testing',
        value: '2',
        category: ['any'],
        schema: schema.string(),
      },
    });

    const router = core.http.createRouter();
    router.get({ path: '/api/ui-settings-plugin', validate: false }, async (context, req, res) => {
      const uiSettingsValue = await context.core.uiSettings.client.get<number>(
        'ui_settings_plugin'
      );
      return res.ok({ body: { uiSettingsValue } });
    });
  }

  public start() {}
  public stop() {}
}
