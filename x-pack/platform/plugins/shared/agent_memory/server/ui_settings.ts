/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_MEMORY_ENABLED_SETTING_ID } from '@kbn/agent-memory-common';
import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';

/**
 * Registered as a *global* setting rather than a per-space one: memory itself is
 * space-agnostic, and the solution navigation trees read it through
 * `core.settings.globalClient` to decide whether to offer the Memory page.
 *
 * Must default to `false`. Callers read it with `get(key, false)`, and that
 * default-override wins over a registered default, so a `true` here would be
 * ignored by the nav and produce confusing behaviour.
 */
export const registerUiSettings = ({
  uiSettings,
}: {
  uiSettings: UiSettingsServiceSetup;
}): void => {
  uiSettings.registerGlobal({
    [AGENT_MEMORY_ENABLED_SETTING_ID]: {
      name: i18n.translate('xpack.agentMemory.uiSettings.enabled.name', {
        defaultMessage: 'Agent memory',
      }),
      description: i18n.translate('xpack.agentMemory.uiSettings.enabled.description', {
        defaultMessage:
          'Offers agent memory in the Context app. Agents can read and write a shared knowledge base, and background workflows curate it.',
      }),
      schema: schema.boolean(),
      value: false,
      experimental: true,
      requiresPageReload: true,
      readonly: false,
    },
  });
};
