/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
import { useFormContext } from 'react-hook-form';
import { RunbookField } from '../fields/runbook_field';
import type { FormValues } from '../types';

export const AttacmentRunbookGroup: React.FC = () => {
  const { watch, setValue } = useFormContext<FormValues>();
  const runbookValue = watch('metadata.runbook');
  const hasRunbook = Boolean(runbookValue?.trim());
  const runbookTitle = runbookValue
    ?.split('\n')
    .find((line) => line.trim().length > 0)
    ?.trim();

  const [isRunbookModalOpen, setIsRunbookModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);

  const openRunbookModal = useCallback(() => {
    setIsRunbookModalOpen(true);
  }, []);

  const closeRunbookModal = useCallback(() => {
    setIsRunbookModalOpen(false);
  }, []);

  const onAddRunbook = useCallback(() => {
    openRunbookModal();
  }, [openRunbookModal]);

  const openDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  const onConfirmDeleteRunbook = useCallback(() => {
    setValue('metadata.runbook', '', {
      shouldDirty: true,
      shouldTouch: true,
    });
    closeDeleteConfirm();
  }, [closeDeleteConfirm, setValue]);

  const toggleAttachmentsOpen = useCallback(() => {
    setIsAttachmentsOpen((prev) => !prev);
  }, []);

  return (
    <EuiSplitPanel.Outer hasBorder={true} hasShadow={false} grow={false}>
      <EuiSplitPanel.Inner color="subdued" paddingSize="m">
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isAttachmentsOpen ? 'arrowDown' : 'arrowRight'}
              onClick={toggleAttachmentsOpen}
              aria-label={i18n.translate('xpack.alertingV2.ruleForm.toggleAttachmentsButtonLabel', {
                defaultMessage: 'Toggle attachments',
              })}
              color="text"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xxs">
              <h3>
                {i18n.translate('xpack.alertingV2.ruleForm.attachmentsGroupTitle', {
                  defaultMessage: 'Attachments',
                })}
              </h3>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiSplitPanel.Inner>
      {isAttachmentsOpen && (
        <EuiSplitPanel.Inner paddingSize="m">
          {!hasRunbook ? (
            <EuiButton
              iconType="plusInCircle"
              onClick={onAddRunbook}
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
                          aria-label={i18n.translate(
                            'xpack.alertingV2.ruleForm.editRunbookButton',
                            {
                              defaultMessage: 'Edit Runbook',
                            }
                          )}
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
        </EuiSplitPanel.Inner>
      )}
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
    </EuiSplitPanel.Outer>
  );
};
