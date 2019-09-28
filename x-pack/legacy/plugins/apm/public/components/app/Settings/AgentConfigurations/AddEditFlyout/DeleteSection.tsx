/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiText
} from '@elastic/eui';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';
import { Config } from '../index';
import { callApmApi } from '../../../../../services/rest/callApmApi';
const t = (id: string, defaultMessage: string, values?: Record<string, any>) =>
  i18n.translate(`xpack.apm.settings.agentConf.flyout.deleteSection.${id}`, {
    defaultMessage,
    values
  });

interface Props {
  onDelete: () => void;
  selectedConfig: Config;
}

export function DeleteSection({ onDelete, selectedConfig }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiTitle size="xs">
        <h3>
          <EuiText color="danger">{t('title', 'Delete configuration')}</EuiText>
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText>
        <p>
          {t(
            'helpText',
            'If you wish to delete this configuration, please be aware that the agents will continue to use the existing configuration until they sync with the APM Server.'
          )}
        </p>
      </EuiText>

      <EuiSpacer size="s" />

      <EuiButton
        fill={false}
        color="danger"
        isLoading={isDeleting}
        iconSide="right"
        onClick={async () => {
          setIsDeleting(true);
          await deleteConfig(selectedConfig);
          setIsDeleting(false);
          onDelete();
        }}
      >
        {t('buttonLabel', 'Delete')}
      </EuiButton>

      <EuiSpacer size="m" />
    </>
  );
}

async function deleteConfig(selectedConfig: Config) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/agent-configuration/{configurationId}',
      method: 'DELETE',
      params: {
        path: { configurationId: selectedConfig.id }
      }
    });
    toastNotifications.addSuccess({
      title: t('deleteConfigSucceededTitle', 'Configuration was deleted'),
      text: t(
        'deleteConfigSucceededText',
        'You have successfully deleted a configuration for {serviceName}. It will take some time to propagate to the agents.',
        { serviceName: `"${selectedConfig.service.name}"` }
      )
    });
  } catch (error) {
    toastNotifications.addDanger({
      title: t('deleteConfigFailedTitle', 'Configuration could not be deleted'),
      text: t(
        'deleteConfigFailedText',
        'Something went wrong when deleting a configuration for {serviceName}. Error: {errorMessage}',
        {
          serviceName: `"${selectedConfig.service.name}"`,
          errorMessage: `"${error.message}"`
        }
      )
    });
  }
}
