/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type {
  CreateConnectorTypeRequest,
  CreateConnectorTypeResponse,
} from '@kbn/actions-plugin/common';
import { createConnectorType as createConnectorTypeApi } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

export interface CreateConnectorTypeError {
  title: string;
  message: string;
}

interface UseCreateConnectorTypeReturnValue {
  isLoading: boolean;
  createConnectorTypeError: CreateConnectorTypeError | null;
  createConnectorType: (
    connectorType: CreateConnectorTypeRequest
  ) => Promise<CreateConnectorTypeResponse | undefined>;
}

export const useCreateConnectorType = (): UseCreateConnectorTypeReturnValue => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const [createConnectorTypeError, setCreateConnectorTypeError] =
    useState<CreateConnectorTypeError | null>(null);
  const isMounted = useRef(false);

  const createConnectorType = useCallback(
    async (connectorType: CreateConnectorTypeRequest) => {
      setCreateConnectorTypeError(null);
      setIsLoading(true);

      try {
        const res = await createConnectorTypeApi({ http, connectorType });

        if (isMounted.current) {
          setIsLoading(false);
          toasts.addSuccess(
            i18n.translate(
              'xpack.triggersActionsUI.sections.useCreateConnectorType.successNotificationText',
              {
                defaultMessage: "Registered connector type ''{displayName}''",
                values: { displayName: connectorType.displayName },
              }
            )
          );
        }

        return res;
      } catch (error) {
        if (isMounted.current) {
          setIsLoading(false);

          const title = i18n.translate(
            'xpack.triggersActionsUI.sections.useCreateConnectorType.errorNotificationTitle',
            { defaultMessage: 'Unable to create the connector type.' }
          );
          const message =
            error.body?.message ??
            i18n.translate(
              'xpack.triggersActionsUI.sections.useCreateConnectorType.errorNotificationText',
              { defaultMessage: 'Check the Kibana logs for more information.' }
            );

          setCreateConnectorTypeError({ title, message });
          toasts.addError(error, { title, toastMessage: message });
        }
      }
    },
    [http, toasts]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return { isLoading, createConnectorTypeError, createConnectorType };
};
