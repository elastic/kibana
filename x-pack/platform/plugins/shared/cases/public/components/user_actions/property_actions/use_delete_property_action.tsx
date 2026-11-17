/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

interface Props<Options> {
  onDelete: (options?: Options) => void;
}

export const useDeletePropertyAction = <Options = never,>({ onDelete }: Props<Options>) => {
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  const onModalOpen = useCallback(() => {
    setShowDeletionModal(true);
  }, []);

  // Takes no arguments so it can be passed straight to a modal's click handler.
  const onConfirm = useCallback(() => {
    setShowDeletionModal(false);
    onDelete();
  }, [onDelete]);

  const onConfirmWithOptions = useCallback(
    (options: Options) => {
      setShowDeletionModal(false);
      onDelete(options);
    },
    [onDelete]
  );

  const onCancel = useCallback(() => {
    setShowDeletionModal(false);
  }, []);

  return { showDeletionModal, onModalOpen, onConfirm, onConfirmWithOptions, onCancel };
};
