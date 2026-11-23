/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useReopenRecord } from '../../hooks';
import { ChangeTypeModal } from '../modals/change_type_modal';
import { CloseModal } from '../modals/close_modal';
import { DeterminationModal } from '../modals/determination_modal';
import { MergeModal } from '../modals/merge_modal';
import type { ModalName, ModalOptions } from '../modals/modal_props';
import { PauseModal } from '../modals/pause_modal';
import * as modalI18n from '../modals/translations';
import { ReportModal } from '../modals/report_modal';
import { RestrictModal } from '../modals/restrict_modal';
import { RunWorkflowModal } from '../modals/run_workflow_modal';
import { ConfirmModal } from '../shared/confirm_modal';

const TAKE_ACTION_SELECTOR = '[data-test-subj="investigationTakeAction"]';
const FOCUS_RETURN_DELAY_MS = 100;

export interface ModalHostProps {
  /** The open modal, or null when none is open. */
  name: ModalName | null;
  /** Input of the open modal, such as the status it moves to. */
  options?: ModalOptions;
  record: InvestigationRecord;
  onClose: () => void;
}

/**
 * Renders the modal the header asked for. Reopening confirms and calls the API directly. When a
 * modal closes and focus has nowhere to go (the menu item that opened it is gone), focus returns
 * to the Take action button.
 */
export const ModalHost: React.FC<ModalHostProps> = ({ name, options, record, onClose }) => {
  const { mutate: reopen, isLoading: isReopening } = useReopenRecord(record.id);

  const handleClose = useCallback(() => {
    onClose();
    window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) {
        document.querySelector<HTMLElement>(TAKE_ACTION_SELECTOR)?.focus();
      }
    }, FOCUS_RETURN_DELAY_MS);
  }, [onClose]);

  switch (name) {
    case 'determination':
      return <DeterminationModal record={record} onClose={handleClose} />;
    case 'report':
      return <ReportModal record={record} onClose={handleClose} />;
    case 'merge':
      return <MergeModal record={record} onClose={handleClose} />;
    case 'close':
      return <CloseModal record={record} onClose={handleClose} statusKey={options?.statusKey} />;
    case 'pause':
      return <PauseModal record={record} onClose={handleClose} statusKey={options?.statusKey} />;
    case 'restrict':
      return <RestrictModal record={record} onClose={handleClose} />;
    case 'runWorkflow':
      return <RunWorkflowModal record={record} onClose={handleClose} />;
    case 'changeType':
      return <ChangeTypeModal record={record} onClose={handleClose} />;
    case 'reopen':
      return (
        <ConfirmModal
          title={modalI18n.REOPEN_TITLE}
          body={modalI18n.REOPEN_BODY}
          confirmLabel={modalI18n.REOPEN_CONFIRM}
          isLoading={isReopening}
          onConfirm={() => reopen(undefined, { onSettled: handleClose })}
          onCancel={handleClose}
          data-test-subj="investigationReopenModal"
        />
      );
    default:
      return null;
  }
};
ModalHost.displayName = 'ModalHost';
