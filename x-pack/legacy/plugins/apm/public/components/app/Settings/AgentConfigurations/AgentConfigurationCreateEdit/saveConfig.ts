/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { AgentConfigurationIntake } from '../../../../../../../../../plugins/apm/server/lib/settings/agent_configuration/configuration_types';
import { APMClient } from '../../../../../services/rest/createCallApmApi';
import { getOptionLabel } from '../../../../../../../../../plugins/apm/common/agent_configuration_constants';

export async function saveConfig({
  callApmApi,
  config,
  isExistingConfig,
  toasts
}: {
  callApmApi: APMClient;
  config: AgentConfigurationIntake;
  agentName?: string;
  isExistingConfig: boolean;
  toasts: NotificationsStart['toasts'];
}) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/agent-configuration',
      method: 'PUT',
      params: {
        query: { overwrite: isExistingConfig },
        body: config
      }
    });

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.settings.agentConf.saveConfig.succeeded.title',
        { defaultMessage: 'Configuration saved' }
      ),
      text: i18n.translate(
        'xpack.apm.settings.agentConf.saveConfig.succeeded.text',
        {
          defaultMessage:
            'The configuration for "{serviceName}" was saved. It will take some time to propagate to the agents.',
          values: { serviceName: getOptionLabel(config.service.name) }
        }
      )
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.settings.agentConf.saveConfig.failed.title',
        { defaultMessage: 'Configuration could not be saved' }
      ),
      text: i18n.translate(
        'xpack.apm.settings.agentConf.saveConfig.failed.text',
        {
          defaultMessage:
            'Something went wrong when saving the configuration for "{serviceName}". Error: "{errorMessage}"',
          values: {
            serviceName: getOptionLabel(config.service.name),
            errorMessage: error.message
          }
        }
      )
    });
  }
}
