/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CASE_PROJECT_OWNER_OPTIONS,
  type CaseProjectOwner,
} from '../../../../common/case_project_owners';
import { useCreateProjectFromCase } from '../../hooks/projects/use_create_project_from_case';

export interface LinkCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinked?: (projectId: string) => void;
}

export const LinkCaseModal = ({ isOpen, onClose, onLinked }: LinkCaseModalProps) => {
  const { linkCaseToProject, isLinking } = useCreateProjectFromCase();
  const [caseId, setCaseId] = useState('');
  const [owner, setOwner] = useState<CaseProjectOwner>('securitySolution');
  const [title, setTitle] = useState('');

  const resetForm = useCallback(() => {
    setCaseId('');
    setOwner('securitySolution');
    setTitle('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedCaseId = caseId.trim();
      if (!trimmedCaseId) {
        return;
      }

      const project = await linkCaseToProject({
        case_id: trimmedCaseId,
        owner,
        ...(title.trim() ? { title: title.trim() } : {}),
      });
      onLinked?.(project.id);
      handleClose();
    },
    [caseId, owner, title, linkCaseToProject, onLinked, handleClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal onClose={handleClose} data-test-subj="agentBuilderLinkCaseModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.agentBuilder.projects.linkCaseModal.title', {
            defaultMessage: 'Link case to project',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiForm component="form" onSubmit={handleSubmit}>
        <EuiModalBody>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.projects.linkCaseModal.caseIdLabel', {
              defaultMessage: 'Case ID',
            })}
            helpText={i18n.translate('xpack.agentBuilder.projects.linkCaseModal.caseIdHelp', {
              defaultMessage: 'The Cases plugin ID for the case you want to link.',
            })}
            fullWidth
          >
            <EuiFieldText
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              fullWidth
              required
              data-test-subj="agentBuilderLinkCaseModalCaseId"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.projects.linkCaseModal.ownerLabel', {
              defaultMessage: 'Case owner',
            })}
            fullWidth
          >
            <EuiSelect
              options={CASE_PROJECT_OWNER_OPTIONS.map((option) => ({
                value: option.value,
                text: option.label,
              }))}
              value={owner}
              onChange={(e) => setOwner(e.target.value as CaseProjectOwner)}
              fullWidth
              data-test-subj="agentBuilderLinkCaseModalOwner"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.translate('xpack.agentBuilder.projects.linkCaseModal.titleLabel', {
              defaultMessage: 'Project title (optional)',
            })}
            fullWidth
          >
            <EuiFieldText
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              data-test-subj="agentBuilderLinkCaseModalTitle"
            />
          </EuiFormRow>
        </EuiModalBody>
        <EuiModalFooter>
          <EuiButtonEmpty onClick={handleClose} data-test-subj="agentBuilderLinkCaseModalCancel">
            {i18n.translate('xpack.agentBuilder.projects.linkCaseModal.cancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            type="submit"
            fill
            isLoading={isLinking}
            disabled={!caseId.trim()}
            data-test-subj="agentBuilderLinkCaseModalSubmit"
          >
            {i18n.translate('xpack.agentBuilder.projects.linkCaseModal.submit', {
              defaultMessage: 'Link case',
            })}
          </EuiButton>
        </EuiModalFooter>
      </EuiForm>
    </EuiModal>
  );
};
