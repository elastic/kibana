/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import { APMClient } from '../../../../../services/rest/createCallApmApi';
import { trackEvent } from '../../../../../../../infra/public/hooks/use_track_metric';
import { isRumAgentName } from '../../../../../../common/agent_name';
import {
  getOptionLabel,
  omitAllOption
} from '../../../../../../common/agent_configuration_constants';

interface Settings {
  transaction_sample_rate: number;
  capture_body?: string;
  transaction_max_spans?: number;
}

export async function saveConfig({
  callApmApi,
  serviceName,
  environment,
  sampleRate,
  captureBody,
  transactionMaxSpans,
  configurationId,
  agentName,
  toasts
}: {
  callApmApi: APMClient;
  serviceName: string;
  environment: string;
  sampleRate: string;
  captureBody: string;
  transactionMaxSpans: string;
  configurationId?: string;
  agentName?: string;
  toasts: NotificationsStart['toasts'];
}) {
  trackEvent({ app: 'apm', name: 'save_agent_configuration' });

  try {
    const settings: Settings = {
      transaction_sample_rate: Number(sampleRate)
    };

    if (!isRumAgentName(agentName)) {
      settings.capture_body = captureBody;
      settings.transaction_max_spans = Number(transactionMaxSpans);
    }

    const configuration = {
      agent_name: agentName,
      service: {
        name: omitAllOption(serviceName),
        environment: omitAllOption(environment)
      },
      settings
    };

    if (configurationId) {
      await callApmApi({
        pathname: '/api/apm/settings/agent-configuration/{configurationId}',
        method: 'PUT',
        params: {
          path: { configurationId },
          body: configuration
        }
      });
    } else {
      await callApmApi({
        pathname: '/api/apm/settings/agent-configuration/new',
        method: 'POST',
        params: {
          body: configuration
        }
      });
    }

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
          values: { serviceName: getOptionLabel(serviceName) }
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
            serviceName: getOptionLabel(serviceName),
            errorMessage: error.message
          }
        }
      )
    });
  }
}
