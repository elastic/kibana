/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

interface Props {
  onConfirmationCallback: () => void;
}

export const useCancelCreationAction = ({ onConfirmationCallback }: Props) => {
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  const onOpenModal = useCallback(() => {
    setShowConfirmationModal(true);
  }, []);

  const onConfirmModal = useCallback(() => {
    setShowConfirmationModal(false);
    onConfirmationCallback();
  }, [onConfirmationCallback]);

  const onCancelModal = useCallback(() => {
    setShowConfirmationModal(false);
  }, []);

  return { showConfirmationModal, onOpenModal, onConfirmModal, onCancelModal };
};
