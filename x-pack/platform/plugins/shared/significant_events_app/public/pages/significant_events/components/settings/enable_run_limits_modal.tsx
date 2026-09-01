/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CONTROLLED_RUN_BUDGET_GROUP_IDS,
  type ControlledRunBudgetGroupId,
  type RunBudgetGroupUsage,
} from '@kbn/significant-events-plugin/common';
import { LimitInput, UsageNumbers } from './run_limit_row';
import { toRunLimit, type RunLimitDraft } from './run_limit_draft';

interface EnableRunLimitsModalProps {
  groups: RunBudgetGroupUsage[];
  drafts: Record<ControlledRunBudgetGroupId, RunLimitDraft>;
  groupLabels: Record<ControlledRunBudgetGroupId, string>;
  isSaving: boolean;
  onChange: (group: ControlledRunBudgetGroupId, draft: RunLimitDraft) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const EnableRunLimitsModal = ({
  groups,
  drafts,
  groupLabels,
  isSaving,
  onChange,
  onCancel,
  onConfirm,
}: EnableRunLimitsModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'enableRunLimitsModalTitle' });
  const valid = CONTROLLED_RUN_BUDGET_GROUP_IDS.every(
    (group) => toRunLimit(drafts[group]) !== undefined
  );

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.significantEventsApp.settings.runLimits.enableModalTitle', {
            defaultMessage: 'Enable daily run limits',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.enableModalDescription',
              {
                defaultMessage:
                  'Review today’s workflow runs and choose the deployment-wide limits. Existing ledger grants are retained, so re-enabling or restoring a cap on the same UTC day resumes its earlier count.',
              }
            )}
          </p>
        </EuiText>
        {CONTROLLED_RUN_BUDGET_GROUP_IDS.map((group, index) => {
          const usage = groups.find((candidate) => candidate.group === group);
          return (
            <React.Fragment key={group}>
              {index > 0 && <EuiHorizontalRule margin="m" />}
              <EuiTitle size="xs">
                <h3>{groupLabels[group]}</h3>
              </EuiTitle>
              {usage && <UsageNumbers usage={usage} />}
              <LimitInput
                group={group}
                draft={drafts[group]}
                disabled={isSaving}
                onChange={(draft) => onChange(group, draft)}
              />
            </React.Fragment>
          );
        })}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} isDisabled={isSaving}>
          {i18n.translate('xpack.significantEventsApp.settings.runLimits.enableCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton fill onClick={onConfirm} isLoading={isSaving} isDisabled={!valid}>
          {i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.enableConfirmButtonLabel',
            {
              defaultMessage: 'Enable run limits',
            }
          )}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
