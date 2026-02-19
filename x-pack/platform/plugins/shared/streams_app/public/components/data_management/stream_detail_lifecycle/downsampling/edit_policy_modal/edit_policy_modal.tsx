/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
  EuiPanel,
} from '@elastic/eui';

export type AffectedResourceType = 'stream' | 'index';

export interface AffectedResource {
  name: string;
  type: AffectedResourceType;
}

export interface EditPolicyModalProps {
  affectedResources: AffectedResource[];
  isManaged?: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onOverwrite: () => void;
  onSaveAsNew: () => void;
}

export function EditPolicyModal({
  affectedResources,
  isManaged = false,
  isProcessing = false,
  onCancel,
  onOverwrite,
  onSaveAsNew,
}: EditPolicyModalProps) {
  const modalTitleId = useGeneratedHtmlId();
  const isInUse = affectedResources.length > 0;
  const streamsCount = isInUse
    ? affectedResources.filter((resource) => resource.type === 'stream').length
    : 0;
  const indicesCount = isInUse
    ? affectedResources.filter((resource) => resource.type === 'index').length
    : 0;
  const streamsLabel =
    streamsCount > 0
      ? i18n.translate('xpack.streams.editPolicyModal.streamsLabel', {
          defaultMessage: '{streamsCount, plural, one {# stream} other {# streams}}',
          values: { streamsCount },
        })
      : null;
  const indicesLabel =
    indicesCount > 0
      ? i18n.translate('xpack.streams.editPolicyModal.indicesLabel', {
          defaultMessage: '{indicesCount, plural, one {# index} other {# indices}}',
          values: { indicesCount },
        })
      : null;
  const affectedResourcesLabel =
    streamsLabel && indicesLabel
      ? i18n.translate('xpack.streams.editPolicyModal.affectedResourcesLabel', {
          defaultMessage: '{streamsLabel} and {indicesLabel}',
          values: {
            streamsLabel,
            indicesLabel,
          },
        })
      : streamsLabel || indicesLabel || '';

  const modalTitle = isInUse
    ? i18n.translate('xpack.streams.editPolicyModal.title', {
        defaultMessage: '{affectedResourcesLabel} will be affected',
        values: {
          affectedResourcesLabel,
        },
      })
    : isManaged
    ? i18n.translate('xpack.streams.editPolicyModal.managedNotInUseTitle', {
        defaultMessage: 'Confirm changes to managed policy',
      })
    : i18n.translate('xpack.streams.editPolicyModal.notInUseTitle', {
        defaultMessage: 'Confirm policy changes',
      });

  const affectedResourceTypeLabelMap: Record<AffectedResourceType, string> = {
    stream: i18n.translate('xpack.streams.editPolicyModal.affectedResourceType.streamLabel', {
      defaultMessage: 'Stream',
    }),
    index: i18n.translate('xpack.streams.editPolicyModal.affectedResourceType.indexLabel', {
      defaultMessage: 'Index',
    }),
  };

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId} css={{ width: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj="editPolicyModalTitle">
          {modalTitle}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        {isManaged && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate('xpack.streams.editPolicyModal.managedWarningTitle', {
                defaultMessage: 'This is a managed policy',
              })}
              color="warning"
              iconType="alert"
              data-test-subj="editPolicyModal-managedWarning"
            >
              <p>
                {i18n.translate('xpack.streams.editPolicyModal.managedWarningDescription', {
                  defaultMessage:
                    'This policy is managed by Elasticsearch. Modifying it may cause unexpected behavior. Consider saving as a new policy instead.',
                })}
              </p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {isInUse && (
          <>
            <EuiText size="s">
              {i18n.translate('xpack.streams.editPolicyModal.description', {
                defaultMessage:
                  'The ILM policy you are updating is currently used in {affectedResourcesLabel}. If you would like your updates to only affect this stream, you may save as a new ILM policy.',
                values: {
                  affectedResourcesLabel,
                },
              })}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              paddingSize="s"
              style={{
                maxHeight: '160px',
                overflowY: 'auto',
              }}
              color="subdued"
              data-test-subj="editPolicyModal-affectedResourcesList"
            >
              <EuiFlexGroup direction="column" gutterSize="s">
                {affectedResources.map((resource) => (
                  <EuiFlexItem key={resource.name}>
                    <EuiFlexGroup
                      justifyContent="spaceBetween"
                      data-test-subj={`editPolicyModal-affectedResourcesList-${resource.name}`}
                    >
                      <EuiText size="s">{resource.name}</EuiText>
                      <EuiText size="xs" color="subdued">
                        {affectedResourceTypeLabelMap[resource.type]}
                      </EuiText>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </EuiPanel>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="editPolicyModal-cancelButton"
              onClick={onCancel}
              disabled={isProcessing}
            >
              {i18n.translate('xpack.streams.editPolicyModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="editPolicyModal-overwriteButton"
                  color="danger"
                  onClick={onOverwrite}
                  disabled={isProcessing}
                  isLoading={isProcessing}
                >
                  {i18n.translate('xpack.streams.editPolicyModal.overwriteButton', {
                    defaultMessage: 'Overwrite',
                  })}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="editPolicyModal-saveAsNewButton"
                  fill
                  onClick={onSaveAsNew}
                  disabled={isProcessing}
                >
                  {i18n.translate('xpack.streams.editPolicyModal.saveAsNewButton', {
                    defaultMessage: 'Save as new',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
