/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBoolean } from '@kbn/react-hooks';
import { useCallback } from 'react';
import { useKibana } from '../../../hooks/use_kibana';

interface KiLifecycleMutation {
  mutateAsync: (
    variables: void,
    options: {
      onSuccess: () => void;
      onError: (error: Error) => void;
    }
  ) => Promise<unknown>;
  isLoading: boolean;
}

interface UseKiLifecycleActionArgs {
  mutation: KiLifecycleMutation;
  successTitle: string;
  successText: string;
  errorTitle: string;
}

export const useKiLifecycleAction = ({
  mutation,
  successTitle,
  successText,
  errorTitle,
}: UseKiLifecycleActionArgs) => {
  const { mutateAsync, isLoading } = mutation;
  const [isOpen, { on: open, off: close }] = useBoolean(false);
  const {
    services: { notifications },
  } = useKibana();

  const confirm = useCallback(async () => {
    await mutateAsync(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: successTitle,
          text: successText,
        });
        close();
      },
      onError: (actionError) => {
        notifications.toasts.addError(actionError, {
          title: errorTitle,
        });
      },
    });
  }, [close, errorTitle, mutateAsync, notifications.toasts, successText, successTitle]);

  return {
    isOpen,
    open,
    close,
    confirm,
    isLoading,
  };
};
