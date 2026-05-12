/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonIcon,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { useController, useFormContext } from 'react-hook-form';
import { RUNBOOK_ARTIFACT_TYPE } from '@kbn/alerting-v2-constants';
import { RunbookField } from '../fields/runbook_field';
import type { FormValues } from '../types';
import { FieldGroup } from './field_group';

export const AttachmentRunbookFieldGroup: React.FC = () => {
  const { setValue, control } = useFormContext<FormValues>();
  const {
    field: { value: artifactsValue },
  } = useController<FormValues, 'artifacts'>({
    control,
    name: 'artifacts',
  });
  const artifacts = artifactsValue;
  const runbookArtifact = artifacts?.find((artifact) => artifact.type === RUNBOOK_ARTIFACT_TYPE);
  const runbookValue = runbookArtifact?.value;
  const hasRunbook = Boolean(runbookValue?.trim());
  const runbookTitle = runbookValue
    ?.split('\n')
    .find((line) => line.trim().length > 0)
    ?.trim();

  const [isRunbookModalOpen, setIsRunbookModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const openRunbookModal = () => {
    setIsRunbookModalOpen(true);
  };

  const closeRunbookModal = () => {
    setIsRunbookModalOpen(false);
  };

  const openDeleteConfirm = () => {
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setIsDeleteConfirmOpen(false);
  };

  const onConfirmDeleteRunbook = () => {
    const nextArtifacts = (artifacts ?? []).filter(
      (artifact) => artifact.type !== RUNBOOK_ARTIFACT_TYPE
    );
    setValue('artifacts', nextArtifacts);
    closeDeleteConfirm();
  };

  return (
    <>
      <FieldGroup
        title={i18n.translate('xpack.alertingV2.ruleForm.attachmentsGroupTitle', {
          defaultMessage: 'Attachments',
        })}
        defaultOpen={false}
      >
        {!hasRunbook ? (
          <EuiButton
            iconType="plusInCircle"
            onClick={openRunbookModal}
            size="s"
            data-test-subj="addRunbookButton"
            color="text"
          >
            {i18n.translate('xpack.alertingV2.ruleForm.addRunbookButton', {
              defaultMessage: 'Add Runbook',
            })}
          </EuiButton>
        ) : (
          <>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.alertingV2.ruleForm.runbookTitle', {
                  defaultMessage: 'Runbook',
                })}
              </h3>
            </EuiTitle>

            <EuiSpacer size="s" />
            <EuiSplitPanel.Outer hasBorder={true} hasShadow={false}>
              <EuiSplitPanel.Inner paddingSize="s">
                <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
                  <EuiFlexItem>
                    <EuiText size="s">{runbookTitle}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                      <EuiButtonIcon
                        iconType="pencil"
                        onClick={openRunbookModal}
                        aria-label={i18n.translate('xpack.alertingV2.ruleForm.editRunbookButton', {
                          defaultMessage: 'Edit Runbook',
                        })}
                        color="text"
                      />
                      <EuiButtonIcon
                        iconType="trash"
                        onClick={openDeleteConfirm}
                        aria-label={i18n.translate(
                          'xpack.alertingV2.ruleForm.deleteRunbookButton',
                          {
                            defaultMessage: 'Delete Runbook',
                          }
                        )}
                        color="danger"
                      />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiSplitPanel.Inner>
            </EuiSplitPanel.Outer>
          </>
        )}
      </FieldGroup>
      <RunbookField isOpen={isRunbookModalOpen} onClose={closeRunbookModal} />
      {isDeleteConfirmOpen && (
        <EuiConfirmModal
          title={i18n.translate('xpack.alertingV2.ruleForm.deleteRunbookConfirmTitle', {
            defaultMessage: 'Delete runbook?',
          })}
          aria-label={i18n.translate('xpack.alertingV2.ruleForm.deleteRunbookConfirmAriaLabel', {
            defaultMessage: 'Delete runbook confirmation',
          })}
          onCancel={closeDeleteConfirm}
          onConfirm={onConfirmDeleteRunbook}
          cancelButtonText={i18n.translate(
            'xpack.alertingV2.ruleForm.deleteRunbookConfirmCancelButton',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.alertingV2.ruleForm.deleteRunbookConfirmDeleteButton',
            { defaultMessage: 'Delete runbook' }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
        >
          <p>
            {i18n.translate('xpack.alertingV2.ruleForm.deleteRunbookConfirmText', {
              defaultMessage: 'Are you sure you want to delete a runbook?',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
