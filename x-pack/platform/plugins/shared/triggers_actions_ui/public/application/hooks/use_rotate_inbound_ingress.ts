/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { useMutation } from '@kbn/react-query';
import { rotateInboundIngress } from '../lib/action_connector_api';
import type { RotateInboundIngressResult } from '../lib/action_connector_api/rotate_inbound_ingress';
import { useKibana } from '../../common/lib/kibana';

interface UseRotateInboundIngressReturnValue {
  isLoading: boolean;
  rotateIngress: (id: string) => Promise<RotateInboundIngressResult>;
}

export const useRotateInboundIngress = (): UseRotateInboundIngressReturnValue => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutation = useMutation({
    mutationFn: (id: string) => rotateInboundIngress({ http, id }),
    onSuccess: () => {
      toasts.addSuccess(
        i18n.translate(
          'xpack.triggersActionsUI.sections.inboundIngress.rotateSuccessNotificationText',
          {
            defaultMessage: 'Ingest token rotated',
          }
        )
      );
    },
    onError: (error: { name?: string; body?: { message?: string } }) => {
      if (error.name === 'AbortError') {
        return;
      }
      toasts.addDanger(
        error.body?.message ??
          i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.rotateErrorNotificationText',
            { defaultMessage: 'Cannot rotate the ingest token.' }
          )
      );
    },
  });

  const { mutateAsync, isLoading } = mutation;
  const rotateIngress = useCallback((id: string) => mutateAsync(id), [mutateAsync]);

  return {
    isLoading,
    rotateIngress,
  };
};
