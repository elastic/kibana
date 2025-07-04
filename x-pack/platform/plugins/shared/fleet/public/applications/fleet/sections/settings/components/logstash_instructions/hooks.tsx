/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode } from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';

import {
  LOGSTASH_API_KEY_CLUSTER_PERMISSIONS,
  LOGSTASH_API_KEY_INDICES,
  LOGSTASH_API_KEY_INDICES_PRIVILEGES,
} from '../../../../../../../common/constants';
import { sendPostLogstashApiKeys, useStartServices } from '../../../../hooks';

export function useLogstashApiKey() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string>();
  const startServices = useStartServices();
  const { notifications } = startServices;
  const generateApiKey = useCallback(async () => {
    try {
      setIsLoading(true);

      const res = await sendPostLogstashApiKeys();
      if (res.error) {
        throw res.error;
      }

      setApiKey(res.data?.api_key);
    } catch (err) {
      if (err.statusCode === 403) {
        notifications.toasts.addDanger(
          {
            title: i18n.translate('xpack.fleet.settings.logstashInstructions.generateApiKeyError', {
              defaultMessage: 'Cannot generate an API key',
            }),
            text: toMountPoint(
              <FormattedMessage
                id="xpack.fleet.settings.logstashInstructions.generateApiKeyPermissions"
                defaultMessage="You need the cluster permissions: {clusterPermissions}{br} and the index permissions: {indexPermissions}{br}for indexes: {br}{indexes}"
                values={{
                  clusterPermissions: (
                    <EuiCode>{LOGSTASH_API_KEY_CLUSTER_PERMISSIONS.join(', ')}</EuiCode>
                  ),
                  indexPermissions: (
                    <EuiCode>{LOGSTASH_API_KEY_INDICES_PRIVILEGES.join(', ')}</EuiCode>
                  ),
                  indexes: LOGSTASH_API_KEY_INDICES.map((index) => (
                    <React.Fragment key={index}>
                      <EuiCode>{index}</EuiCode>
                      <br />
                    </React.Fragment>
                  )),
                  br: <br />,
                }}
              />,
              startServices
            ),
          },
          {}
        );
      } else {
        notifications.toasts.addError(err, {
          title: i18n.translate('xpack.fleet.settings.logstashInstructions.generateApiKeyError', {
            defaultMessage: 'Cannot generate an API key',
          }),
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [notifications.toasts, startServices]);

  return useMemo(
    () => ({
      isLoading,
      generateApiKey,
      apiKey,
    }),
    [isLoading, generateApiKey, apiKey]
  );
}
