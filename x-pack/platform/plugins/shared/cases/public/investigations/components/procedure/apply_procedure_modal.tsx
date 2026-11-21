/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  InvestigationRecord,
  ProcedureTemplate,
  TaskItem,
} from '../../../../common/investigations/types';
import { useApplyProcedure, useInvestigationToasts } from '../../hooks';
import { isTaskFinished } from './procedure_helpers';
import * as i18n from './translations';

export interface ApplyProcedureModalProps {
  record: InvestigationRecord;
  tasks: readonly TaskItem[];
  templates: readonly ProcedureTemplate[];
  /** Procedure types that can be applied. */
  typeNames: readonly string[];
  initialType: string;
  onClose: () => void;
}

/** Applies a procedure to the record. With existing tasks, unfinished ones are replaced. */
export const ApplyProcedureModal: React.FC<ApplyProcedureModalProps> = ({
  record,
  tasks,
  templates,
  typeNames,
  initialType,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const { mutate, isLoading } = useApplyProcedure(record.id);
  const [type, setType] = useState(initialType);
  const unfinished = tasks.filter((task) => !isTaskFinished(task)).length;
  const hasTasks = tasks.length > 0;
  const hasTemplate = templates.some((template) => template.type === type);

  const apply = () =>
    mutate(
      { type, replace: hasTasks },
      {
        onSuccess: () => {
          showSuccess(i18n.APPLY_SUCCESS(type));
          onClose();
        },
      }
    );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationApplyProcedureModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.APPLY_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow label={i18n.APPLY_TYPE_LABEL} fullWidth>
          <EuiSelect
            fullWidth
            value={type}
            options={typeNames.map((name) => ({ value: name, text: name }))}
            onChange={(event) => setType(event.target.value)}
            data-test-subj="investigationApplyProcedureType"
          />
        </EuiFormRow>
        <EuiText size="s">
          <p>
            {hasTasks ? i18n.APPLY_BODY_REPLACE(type, unfinished) : i18n.APPLY_BODY_NO_TASKS(type)}
          </p>
        </EuiText>
        {hasTemplate ? null : (
          <EuiCallOut
            announceOnMount={false}
            size="s"
            color="warning"
            title={i18n.NO_TEMPLATE_FOR_TYPE}
            data-test-subj="investigationApplyProcedureNoTemplate"
          />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationApplyProcedureCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          color={hasTasks ? 'warning' : 'primary'}
          isLoading={isLoading}
          isDisabled={!hasTemplate}
          onClick={apply}
          data-test-subj="investigationApplyProcedureSubmit"
        >
          {hasTasks ? i18n.APPLY_CONFIRM : i18n.APPLY_PROCEDURE}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
ApplyProcedureModal.displayName = 'ApplyProcedureModal';
