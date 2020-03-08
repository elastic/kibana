/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { NotificationsStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { Config } from '../index';
import { getOptionLabel } from '../../../../../../../../../plugins/apm/common/agent_configuration_constants';
import { callApmApi } from '../../../../../services/rest/createCallApmApi';
import { useApmPluginContext } from '../../../../../hooks/useApmPluginContext';

interface Props {
  service: Config['service'];
}

export function DeleteButton({ service }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;

  return (
    <EuiButtonEmpty
      color="danger"
      isLoading={isDeleting}
      iconSide="right"
      onClick={async () => {
        setIsDeleting(true);
        await deleteConfig(service, toasts);
        setIsDeleting(false);
      }}
    >
      {i18n.translate(
        'xpack.apm.settings.agentConf.deleteSection.buttonLabel',
        { defaultMessage: 'Delete' }
      )}
    </EuiButtonEmpty>
  );
}

async function deleteConfig(
  service: Config,
  toasts: NotificationsStart['toasts']
) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/agent-configuration',
      method: 'DELETE',
      params: {
        body: {
          service: {
            name: service.service.name,
            environment: service.service.environment
          }
        }
      }
    });

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.apm.settings.agentConf.deleteSection.deleteConfigSucceededTitle',
        { defaultMessage: 'Configuration was deleted' }
      ),
      text: i18n.translate(
        'xpack.apm.settings.agentConf.deleteSection.deleteConfigSucceededText',
        {
          defaultMessage:
            'You have successfully deleted a configuration for "{serviceName}". It will take some time to propagate to the agents.',
          values: { serviceName: getOptionLabel(service.service.name) }
        }
      )
    });
  } catch (error) {
    toasts.addDanger({
      title: i18n.translate(
        'xpack.apm.settings.agentConf.deleteSection.deleteConfigFailedTitle',
        { defaultMessage: 'Configuration could not be deleted' }
      ),
      text: i18n.translate(
        'xpack.apm.settings.agentConf.deleteSection.deleteConfigFailedText',
        {
          defaultMessage:
            'Something went wrong when deleting a configuration for "{serviceName}". Error: "{errorMessage}"',
          values: {
            serviceName: getOptionLabel(service.service.name),
            errorMessage: error.message
          }
        }
      )
    });
  }
}
