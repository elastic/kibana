/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { useDeleteKi, useRestoreKi } from '../../../hooks/use_ki_mutations';
import { useKiLifecycleAction } from './use_ki_lifecycle_action';

type DeleteKiMutation = ReturnType<typeof useDeleteKi>;
type RestoreKiMutation = ReturnType<typeof useRestoreKi>;

interface UseKiPageDeleteRestoreActionsArgs {
  deleteKiMutation: DeleteKiMutation;
  restoreKiMutation: RestoreKiMutation;
}

export const useKiPageDeleteRestoreActions = ({
  deleteKiMutation,
  restoreKiMutation,
}: UseKiPageDeleteRestoreActionsArgs) => {
  const deleteAction = useKiLifecycleAction({
    mutation: deleteKiMutation,
    successTitle: i18n.translate('xpack.contextEngine.viewKi.deleteSuccess.title', {
      defaultMessage: 'Knowledge Indicator deleted',
    }),
    successText: i18n.translate('xpack.contextEngine.viewKi.deleteSuccess.text', {
      defaultMessage: 'It will no longer be retrieved by default.',
    }),
    errorTitle: i18n.translate('xpack.contextEngine.viewKi.deleteError.title', {
      defaultMessage: 'Unable to delete Knowledge Indicator',
    }),
  });

  const restoreAction = useKiLifecycleAction({
    mutation: restoreKiMutation,
    successTitle: i18n.translate('xpack.contextEngine.viewKi.restoreSuccess.title', {
      defaultMessage: 'Knowledge Indicator restored',
    }),
    successText: i18n.translate('xpack.contextEngine.viewKi.restoreSuccess.text', {
      defaultMessage: 'It can be retrieved again.',
    }),
    errorTitle: i18n.translate('xpack.contextEngine.viewKi.restoreError.title', {
      defaultMessage: 'Unable to restore Knowledge Indicator',
    }),
  });

  return { deleteAction, restoreAction };
};
