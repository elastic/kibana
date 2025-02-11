/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

interface Props {
  onDelete: () => void;
}

export const useDeletePropertyAction = ({ onDelete }: Props) => {
  const [showDeletionModal, setShowDeletionModal] = useState(false);

  const onModalOpen = useCallback(() => {
    setShowDeletionModal(true);
  }, []);

  const onConfirm = useCallback(() => {
    setShowDeletionModal(false);
    onDelete();
  }, [onDelete]);

  const onCancel = useCallback(() => {
    setShowDeletionModal(false);
  }, []);

  return { showDeletionModal, onModalOpen, onConfirm, onCancel };
};
