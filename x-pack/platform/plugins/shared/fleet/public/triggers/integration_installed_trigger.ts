/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  FLEET_INTEGRATION_INSTALLED_TRIGGER_ID,
  integrationInstalledTriggerDefinition,
} from '../../common/triggers/integration_installed_trigger';

export const integrationInstalledPublicTriggerDefinition: PublicTriggerDefinition = {
  ...integrationInstalledTriggerDefinition,
  title: i18n.translate('xpack.fleet.triggers.integrationInstalled.title', {
    defaultMessage: 'Integration installed',
  }),
  description: i18n.translate('xpack.fleet.triggers.integrationInstalled.description', {
    defaultMessage:
      'Emitted when a Fleet integration package is installed. Use to automate post-installation setup such as configuring detection rules or dashboards.',
  }),
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/package').then(({ icon }) => ({
      default: icon,
    }))
  ),
  documentation: {
    details: i18n.translate('xpack.fleet.triggers.integrationInstalled.documentation.details', {
      defaultMessage:
        'Emitted when a Fleet integration is installed. The event includes `package_name`, `package_version`, and `install_source` (registry, upload, bundled, or custom). Use KQL in `on.condition` to filter by package name or install source.',
    }),
    examples: [
      i18n.translate(
        'xpack.fleet.triggers.integrationInstalled.documentation.exampleFilterByPackage',
        {
          defaultMessage: `## Filter by package name
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.package_name: "endpoint"'
\`\`\``,
          values: { triggerId: FLEET_INTEGRATION_INSTALLED_TRIGGER_ID },
        }
      ),
      i18n.translate(
        'xpack.fleet.triggers.integrationInstalled.documentation.exampleFilterBySource',
        {
          defaultMessage: `## Filter by install source
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.install_source: "registry"'
\`\`\``,
          values: { triggerId: FLEET_INTEGRATION_INSTALLED_TRIGGER_ID },
        }
      ),
    ],
  },
  snippets: {
    condition: 'event.package_name: "endpoint"',
  },
};
