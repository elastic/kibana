/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '../../types';
import { rotateInboundIngress } from '../lib/action_connector_api';
import { useKibana } from '../../common/lib/kibana';

interface UseRotateInboundIngressReturnValue {
  isLoading: boolean;
  rotateIngress: (id: string) => Promise<ActionConnector | undefined>;
}

export const useRotateInboundIngress = (): UseRotateInboundIngressReturnValue => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [isLoading, setIsLoading] = useState(false);
  const abortCtrlRef = useRef(new AbortController());
  const isMounted = useRef(false);

  const rotateIngress = useCallback(
    async (id: string) => {
      setIsLoading(true);
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      try {
        const res = await rotateInboundIngress({ http, id });

        if (isMounted.current) {
          setIsLoading(false);
          toasts.addSuccess(
            i18n.translate(
              'xpack.triggersActionsUI.sections.inboundIngress.rotateSuccessNotificationText',
              {
                defaultMessage: 'Ingest token rotated',
              }
            )
          );
        }

        return res;
      } catch (error) {
        if (isMounted.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toasts.addDanger(
              error.body?.message ??
                i18n.translate(
                  'xpack.triggersActionsUI.sections.inboundIngress.rotateErrorNotificationText',
                  { defaultMessage: 'Cannot rotate the ingest token.' }
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

  return { isLoading, rotateIngress };
};
