/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import type { GenerateConnectorTypeErrorReason } from '../../../common/connector_type_generation';
import { generateConnectorType as generateConnectorTypeApi } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

const GENERATE_CONNECTOR_TYPE_ERROR_REASONS: readonly GenerateConnectorTypeErrorReason[] = [
  'invalid_url',
  'blocked_destination',
  'fetch_failed',
  'unsupported_content',
  'too_large',
  'no_model',
  'model_error',
  'invalid_output',
];

export interface GenerateConnectorTypeError {
  title: string;
  message: string;
  reason?: GenerateConnectorTypeErrorReason;
}

interface UseGenerateConnectorTypeReturnValue {
  isLoading: boolean;
  generateConnectorTypeError: GenerateConnectorTypeError | null;
  generateConnectorType: (url: string) => Promise<CreateConnectorTypeRequest | undefined>;
}

const isGenerateConnectorTypeErrorReason = (
  reason: unknown
): reason is GenerateConnectorTypeErrorReason =>
  typeof reason === 'string' &&
  GENERATE_CONNECTOR_TYPE_ERROR_REASONS.includes(reason as GenerateConnectorTypeErrorReason);

export const useGenerateConnectorType = (): UseGenerateConnectorTypeReturnValue => {
  const { http } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const [generateConnectorTypeError, setGenerateConnectorTypeError] =
    useState<GenerateConnectorTypeError | null>(null);
  const isMounted = useRef(false);

  const generateConnectorType = useCallback(
    async (url: string) => {
      setGenerateConnectorTypeError(null);
      setIsLoading(true);

      try {
        const res = await generateConnectorTypeApi({ http, url });

        if (isMounted.current) {
          setIsLoading(false);
        }

        return res.connectorType;
      } catch (error) {
        if (isMounted.current) {
          setIsLoading(false);

          const title = i18n.translate(
            'xpack.triggersActionsUI.sections.useGenerateConnectorType.errorTitle',
            { defaultMessage: 'Unable to generate a connector draft.' }
          );
          const message =
            error.body?.message ??
            i18n.translate('xpack.triggersActionsUI.sections.useGenerateConnectorType.errorText', {
              defaultMessage: 'Check the Kibana logs for more information.',
            });
          const reason = error.body?.attributes?.reason;

          setGenerateConnectorTypeError({
            title,
            message,
            ...(isGenerateConnectorTypeErrorReason(reason) ? { reason } : {}),
          });
        }
      }
    },
    [http]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return { isLoading, generateConnectorTypeError, generateConnectorType };
};
