/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NotificationsStart } from 'kibana/public';
import React, { useState } from 'react';
import { useCallApmApi } from '../../../../../../hooks/useCallApmApi';
import { APMClient } from '../../../../../../services/rest/createCallApmApi';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';

interface Props {
  onDelete: () => void;
  customLinkId: string;
}

export function DeleteButton({ onDelete, customLinkId }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;
  const callApmApi = useCallApmApi();

  return (
    <EuiButtonEmpty
      color="danger"
      isLoading={isDeleting}
      iconSide="right"
      onClick={async () => {
        setIsDeleting(true);
        await deleteConfig(callApmApi, customLinkId, toasts);
        setIsDeleting(false);
        onDelete();
      }}
    >
      {i18n.translate('xpack.apm.settings.customizeUI.customLink.delete', {
        defaultMessage: 'Delete'
      })}
    </EuiButtonEmpty>
  );
}

async function deleteConfig(
  callApmApi: APMClient,
  customLinkId: string,
  toasts: NotificationsStart['toasts']
) {
  try {
    await callApmApi({
      pathname: '/api/apm/settings/custom-links/{id}',
      method: 'DELETE',
      params: {
        path: { id: customLinkId }
      }
    });
    toasts.addSuccess({
      iconType: 'trash',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.delete.successed',
        { defaultMessage: 'Deleted custom link.' }
      )
    });
  } catch (error) {
    toasts.addDanger({
      iconType: 'cross',
      title: i18n.translate(
        'xpack.apm.settings.customizeUI.customLink.delete.failed',
        { defaultMessage: 'Custom link could not be deleted' }
      )
    });
  }
}
