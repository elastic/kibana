/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButton,
  EuiButtonEmpty,
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
import { IlmLink } from '../../general_data/ilm_link';

export type AffectedResourceType = 'stream' | 'index';

export interface AffectedResource {
  name: string;
  type: AffectedResourceType;
}

export interface EditPolicyModalProps {
  policyName: string;
  affectedResources: AffectedResource[];
  isManaged?: boolean;
  isProcessing?: boolean;
  onCancel: () => void;
  onOverwrite: () => void;
  onSaveAsNew: () => void;
}

export function EditPolicyModal({
  policyName,
  affectedResources,
  isManaged = false,
  isProcessing = false,
  onCancel,
  onOverwrite,
  onSaveAsNew,
}: EditPolicyModalProps) {
  const modalTitleId = useGeneratedHtmlId();
  const isInUse = affectedResources.length > 0;
  const streamsCount = affectedResources.filter((resource) => resource.type === 'stream').length;
  const indicesCount = affectedResources.filter((resource) => resource.type === 'index').length;
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
  const usageLabel =
    streamsLabel && indicesLabel
      ? i18n.translate('xpack.streams.editPolicyModal.affectedResourcesLabel', {
          defaultMessage: '{streamsLabel} and {indicesLabel}',
          values: {
            streamsLabel,
            indicesLabel,
          },
        })
      : streamsLabel || indicesLabel || '';

  const policyNameNode = (
    <IlmLink policyName={policyName} data-test-subj="editPolicyModal-policyNameLink" />
  );

  // The modal comes in three flavors depending on why the change needs
  // confirmation, keeping a single consistent layout across all cases:
  //   - managed + in use ("Both")
  //   - in use only ("Multiple data sources only")
  //   - managed only ("Managed only")
  const description =
    isManaged && isInUse ? (
      <FormattedMessage
        id="xpack.streams.editPolicyModal.managedAndInUseDescription"
        defaultMessage="ILM policy {policyName} is managed by Elastic and is already being used in {usageLabel} in addition to this stream. Consider saving as a new ILM policy to avoid unintended changes."
        values={{ policyName: policyNameNode, usageLabel }}
      />
    ) : isInUse ? (
      <FormattedMessage
        id="xpack.streams.editPolicyModal.inUseDescription"
        defaultMessage="ILM policy {policyName} is already being used in {usageLabel} in addition to this stream. Consider saving as a new ILM policy to avoid unintended changes."
        values={{ policyName: policyNameNode, usageLabel }}
      />
    ) : (
      <FormattedMessage
        id="xpack.streams.editPolicyModal.managedDescription"
        defaultMessage="ILM policy {policyName} is managed by Elastic. Consider saving as a new ILM policy to avoid unintended changes."
        values={{ policyName: policyNameNode }}
      />
    );

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
          {i18n.translate('xpack.streams.editPolicyModal.title', {
            defaultMessage: 'Confirm changes to ILM policy',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s" data-test-subj="editPolicyModal-description">
          <p>{description}</p>
        </EuiText>
        {isInUse && (
          <>
            <EuiSpacer size="m" />
            <EuiText size="s" data-test-subj="editPolicyModal-affectedResourcesTitle">
              <strong>
                {i18n.translate('xpack.streams.editPolicyModal.affectedResourcesTitle', {
                  defaultMessage: 'Affected data sources',
                })}
              </strong>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              paddingSize="s"
              css={css`
                max-height: 160px;
                overflow-y: auto;
              `}
              color="subdued"
              data-test-subj="editPolicyModal-affectedResourcesList"
              tabIndex={0}
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
              flush="both"
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
                  onClick={() => {
                    onOverwrite();
                  }}
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
