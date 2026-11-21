/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useReopenRecord } from '../../hooks';
import { CloseModal } from '../modals/close_modal';
import { DeterminationModal } from '../modals/determination_modal';
import { HistoryModal } from '../modals/history_modal';
import { MergeModal } from '../modals/merge_modal';
import type { ModalName } from '../modals/modal_props';
import * as modalI18n from '../modals/translations';
import { ReportModal } from '../modals/report_modal';
import { ConfirmModal } from '../shared/confirm_modal';

export interface ModalHostProps {
  /** The open modal, or null when none is open. */
  name: ModalName | null;
  record: InvestigationRecord;
  onClose: () => void;
}

/** Renders the modal the header asked for. Reopening confirms and calls the API directly. */
export const ModalHost: React.FC<ModalHostProps> = ({ name, record, onClose }) => {
  const { mutate: reopen, isLoading: isReopening } = useReopenRecord(record.id);

  switch (name) {
    case 'determination':
      return <DeterminationModal record={record} onClose={onClose} />;
    case 'report':
      return <ReportModal record={record} onClose={onClose} />;
    case 'history':
      return <HistoryModal record={record} onClose={onClose} />;
    case 'merge':
      return <MergeModal record={record} onClose={onClose} />;
    case 'close':
      return <CloseModal record={record} onClose={onClose} />;
    case 'reopen':
      return (
        <ConfirmModal
          title={modalI18n.REOPEN_TITLE}
          body={modalI18n.REOPEN_BODY}
          confirmLabel={modalI18n.REOPEN_CONFIRM}
          isLoading={isReopening}
          onConfirm={() => reopen(undefined, { onSettled: onClose })}
          onCancel={onClose}
          data-test-subj="investigationReopenModal"
        />
      );
    default:
      return null;
  }
};
ModalHost.displayName = 'ModalHost';
