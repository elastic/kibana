/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { HttpSetup, IToasts } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { AdditionalEmailServices } from '../../../common';
import { EmailConfig } from '../types';
import { getServiceConfig } from './api';

interface Props {
  http: HttpSetup;
  toasts: IToasts;
}

interface UseEmailConfigReturnValue {
  isLoading: boolean;
  getEmailServiceConfig: (
    service: string
  ) => Promise<Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>> | undefined>;
}

const getConfig = (
  service: string,
  config: Partial<Pick<EmailConfig, 'host' | 'port' | 'secure'>>
): Pick<EmailConfig, 'host' | 'port' | 'secure'> | undefined => {
  if (service) {
    if (service === AdditionalEmailServices.EXCHANGE) {
      return;
    }

    return {
      host: config?.host ? config.host : '',
      port: config?.port ? config.port : 0,
      secure: null != config?.secure ? config.secure : false,
    };
  }
};

export function useEmailConfig({ http, toasts }: Props): UseEmailConfigReturnValue {
  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  const getEmailServiceConfig = useCallback(
    async (service: string | null) => {
      if (service == null || isEmpty(service)) {
        return;
      }

      setIsLoading(true);
      isMounted.current = true;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      try {
        const serviceConfig = await getServiceConfig({ http, service });
        if (isMounted.current) {
          setIsLoading(false);
        }

        return getConfig(service, serviceConfig);
      } catch (error) {
        if (isMounted.current) {
          setIsLoading(false);

          if (error.name !== 'AbortError') {
            toasts.addDanger(
              error.body?.message ??
                i18n.translate(
                  'xpack.stackConnectors.components.email.updateErrorNotificationText',
                  { defaultMessage: 'Cannot get service configuration' }
                )
            );
          }
        }
      }
    },
    [http, toasts]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      abortCtrlRef.current.abort();
    };
  }, []);

  return {
    isLoading,
    getEmailServiceConfig,
  };
}
