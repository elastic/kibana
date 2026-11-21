/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type {
  InvestigationRecord,
  ProcedureTemplate,
  TaskItem,
} from '../../../../common/investigations/types';
import { useInvestigationToasts } from '../../hooks';
import { useApplyRecordProcedure } from '../../hooks/use_tasks';
import { ConfirmModal } from '../shared';
import { isTaskFinished } from './procedure_helpers';
import * as i18n from './translations';

export interface ApplyProcedureModalProps {
  record: InvestigationRecord;
  tasks: readonly TaskItem[];
  /** The task list of the record's investigation type. */
  template: ProcedureTemplate | undefined;
  onClose: () => void;
}

/**
 * Applies the task list of the record's investigation type. The type itself is changed only by
 * Take action, Change type. With tasks, the unfinished ones are replaced.
 */
export const ApplyProcedureModal: React.FC<ApplyProcedureModalProps> = ({
  record,
  tasks,
  template,
  onClose,
}) => {
  const { showSuccess } = useInvestigationToasts();
  const { mutate, isLoading } = useApplyRecordProcedure(record.id);
  const type = record.investigation_type;
  const unfinished = tasks.filter((task) => !isTaskFinished(task)).length;
  const hasTasks = tasks.length > 0;

  const apply = () =>
    mutate(
      { replace: hasTasks, template_id: template?.template_id ?? null },
      {
        onSuccess: () => {
          showSuccess(i18n.APPLY_SUCCESS(type));
          onClose();
        },
      }
    );

  return (
    <ConfirmModal
      title={i18n.APPLY_TITLE(type)}
      body={
        <>
          <EuiText size="s">
            <p>
              {hasTasks
                ? i18n.APPLY_BODY_REPLACE(type, unfinished)
                : i18n.APPLY_BODY_NO_TASKS(type)}
            </p>
          </EuiText>
        </>
      }
      confirmLabel={hasTasks ? i18n.APPLY_CONFIRM : i18n.APPLY_PROCEDURE}
      cancelLabel={i18n.CANCEL}
      destructive={hasTasks}
      isLoading={isLoading}
      onConfirm={apply}
      onCancel={onClose}
      data-test-subj="investigationApplyProcedureModal"
    />
  );
};
ApplyProcedureModal.displayName = 'ApplyProcedureModal';
