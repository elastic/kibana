/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Legacy } from 'kibana';
import { Root } from 'joi';
import { resolve } from 'path';

export function alertingUI(kibana: any) {
  return new kibana.Plugin({
    id: 'alerting_ui',
    configPrefix: 'xpack.alerting_ui',
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'actions'],
    isEnabled(config: Legacy.KibanaConfig) {
      return (
        config.get('xpack.alerting_ui.enabled') &&
        (config.get('xpack.actions.enabled') || config.get('xpack.alerting.enabled'))
      );
    },
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(false),
        })
        .default();
    },
    uiExports: {
      hacks: ['plugins/alerting_ui/hacks/register'],
      managementSections: ['plugins/alerting_ui'],
    },
    // TODO: Remove init
    init(server: any) {
      server.plugins.alerting.setup.registerType({
        id: 'test.always-firing',
        name: 'Test: Always Firing',
        actionGroups: ['default', 'other'],
        async executor({ services, params, state }: any) {
          let group = 'default';

          if (params.groupsToScheduleActionsInSeries) {
            const index = state.groupInSeriesIndex || 0;
            group = params.groupsToScheduleActionsInSeries[index];
          }

          if (group) {
            services
              .alertInstanceFactory('1')
              .replaceState({ instanceStateValue: true })
              .scheduleActions(group, {
                instanceContextValue: true,
              });
          }
          await services.callCluster('index', {
            index: params.index,
            refresh: 'wait_for',
            body: {
              state,
              params,
              reference: params.reference,
              source: 'alert:test.always-firing',
            },
          });
          return {
            globalStateValue: true,
            groupInSeriesIndex: (state.groupInSeriesIndex || 0) + 1,
          };
        },
      });
    },
  });
}
