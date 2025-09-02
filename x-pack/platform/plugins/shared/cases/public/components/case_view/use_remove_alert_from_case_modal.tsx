/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import { CasesContextStoreActionsList } from '../cases_context/state/cases_context_reducer';
import { useCasesContext } from '../cases_context/use_cases_context';

export const useRemoveAlertFromCaseModal = ({
  alertId,
  caseId,
  onClose,
  onSuccess,
}: {
  alertId: string[];
  caseId: string;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const { dispatch } = useCasesContext();

  const closeModal = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.CLOSE_REMOVE_ALERT_MODAL,
    });
  }, [dispatch]);

  const openModal = useCallback(() => {
    dispatch({
      type: CasesContextStoreActionsList.OPEN_REMOVE_ALERT_MODAL,
      payload: {
        caseId,
        alertId,
        onClose: () => {
          closeModal();
          return onClose();
        },
        onSuccess: () => {
          closeModal();
          return onSuccess();
        },
      },
    });
  }, [dispatch, alertId, caseId, onClose, onSuccess, closeModal]);

  return useMemo(() => {
    return {
      open: openModal,
      close: closeModal,
      onSuccess,
      onClose,
    };
  }, [openModal, closeModal, onClose, onSuccess]);
};

export type UseRemoveAlertFromCaseModalProps = typeof useRemoveAlertFromCaseModal;
