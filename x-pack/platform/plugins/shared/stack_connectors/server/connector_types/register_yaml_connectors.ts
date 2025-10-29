/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginSetupContract as ActionsPluginSetupContract } from '@kbn/actions-plugin/server';

import yaml from 'js-yaml';
import fs from 'fs';

import { z } from '@kbn/zod';

export function registerYAMLConnectors({ actions }: { actions: ActionsPluginSetupContract }) {
  const dirname =
    'x-pack/platform/plugins/shared/stack_connectors/server/connector_types/yaml_connectors/';
  fs.readdir(
    dirname,
    // @ts-ignore
    function (err, filenames) {
      if (err) {
        return;
      }

      filenames.forEach(function (filename: string) {
        const yamlConnector = yaml.load(fs.readFileSync(dirname + filename, 'utf8'));
        let secrets;

        // @ts-ignore
        if (yamlConnector.authenticators.includes('BasicAuth')) {
          secrets = {
            schema: z.object({
              username: z.string().nullable().default(null),
              password: z.string().nullable().default(null),
            }),
          };
        }

        const connectorFromYAML = {
          id: yamlConnector.id,
          name: yamlConnector.displayName,
          minimumLicenseRequired: 'gold',
          supportedFeatureIds: ['alerting'],
          // @ts-ignore
          uiFields: {
            iconClass: yamlConnector.icon,
            selectMessage: yamlConnector.description,
            actionTypeTitle: yamlConnector.displayName,
          },
          validate: {
            config: {
              schema: z.object({
                url: z.string(),
                method: z.string(),
                headers: z.optional(z.record(z.string(), z.string())),
                hasAuth: z.boolean().default(false),
              }),
            },
            secrets,
            // params: {},
          },
          // renderParameterTemplates,
          // executor: async () => {},
        };

        actions.registerType(connectorFromYAML);
      });
    }
  );
}
