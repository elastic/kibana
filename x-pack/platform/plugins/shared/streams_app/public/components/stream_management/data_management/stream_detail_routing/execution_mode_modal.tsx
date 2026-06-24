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
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Condition } from '@kbn/streamlang';
import { ConditionDisplay } from '../shared';

type ExecutionMode = 'draft' | 'final';

export function ExecutionModeModal({
  streamName,
  condition,
  onCancel,
  onConfirm,
  parentIsDraft = false,
  hasDraftSiblings = false,
}: {
  streamName: string;
  condition: Condition;
  onCancel: () => void;
  onConfirm: (isDraft: boolean) => void;
  parentIsDraft?: boolean;
  hasDraftSiblings?: boolean;
}) {
  const [selectedMode, setSelectedMode] = useState<ExecutionMode>('draft');
  // Final is unavailable when the parent is a draft (children must be drafts) or when draft
  // siblings already exist (a Final stream can't be ordered after existing drafts).
  const isFinalDisabled = parentIsDraft || hasDraftSiblings;

  return (
    <EuiModal onClose={onCancel} data-test-subj="streamsAppExecutionModeModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.executionModeModal.title', {
            defaultMessage: 'Confirm stream creation',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={i18n.translate('xpack.streams.executionModeModal.streamNameLabel', {
            defaultMessage: 'Stream name',
          })}
        >
          <EuiFieldText value={streamName} readOnly />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiPanel color="subdued" paddingSize="s" hasShadow={false}>
          <ConditionDisplay condition={condition} />
        </EuiPanel>
        <EuiSpacer size="l" />
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.executionModeModal.selectExecutionMode', {
              defaultMessage: 'Select execution mode',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.streams.executionModeModal.description', {
              defaultMessage:
                "Define how data is routed and processed in the new stream. We recommend using Draft if you're not sure on your architecture",
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        {parentIsDraft && (
          <>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="primary"
              iconType="info"
              title={i18n.translate('xpack.streams.executionModeModal.parentIsDraftTitle', {
                defaultMessage: 'Parent stream is a draft',
              })}
            >
              {i18n.translate('xpack.streams.executionModeModal.parentIsDraftDescription', {
                defaultMessage:
                  'Child streams of a draft parent must also be drafts. Convert the parent to ingest-time first to create stored (Final) children.',
              })}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        {!parentIsDraft && hasDraftSiblings && (
          <>
            <EuiCallOut
              announceOnMount={false}
              size="s"
              color="primary"
              iconType="info"
              title={i18n.translate('xpack.streams.executionModeModal.hasDraftSiblingsTitle', {
                defaultMessage: 'This stream already has draft children',
              })}
            >
              {i18n.translate('xpack.streams.executionModeModal.hasDraftSiblingsDescription', {
                defaultMessage:
                  'Stored (Final) streams must come before drafts in the routing order, so new streams must also be drafts while drafts exist. Convert the existing drafts to ingest-time first to create a stored (Final) stream.',
              })}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem>
            <EuiCheckableCard
              id="execution-mode-draft"
              label={
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.streams.executionModeModal.draftLabel', {
                      defaultMessage: 'Draft',
                    })}
                  </strong>
                  {' \u2014 '}
                  {i18n.translate('xpack.streams.executionModeModal.draftSubtitle', {
                    defaultMessage: 'flexible and non-destructive.',
                  })}
                </EuiText>
              }
              checked={selectedMode === 'draft'}
              onChange={() => setSelectedMode('draft')}
              data-test-subj="streamsAppExecutionModeDraftCard"
            >
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.executionModeModal.draftDescription', {
                  defaultMessage:
                    'Processing happens at query time, without modifying your original data. You can update or test changes retroactively.',
                })}
              </EuiText>
            </EuiCheckableCard>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiCheckableCard
              id="execution-mode-final"
              label={
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.streams.executionModeModal.finalLabel', {
                      defaultMessage: 'Final',
                    })}
                  </strong>
                  {' \u2014 '}
                  {i18n.translate('xpack.streams.executionModeModal.finalSubtitle', {
                    defaultMessage: 'stored and optimized for fast search',
                  })}
                </EuiText>
              }
              checked={selectedMode === 'final'}
              onChange={() => setSelectedMode('final')}
              disabled={isFinalDisabled}
              data-test-subj="streamsAppExecutionModeFinalCard"
            >
              <EuiText size="xs" color="subdued">
                {i18n.translate('xpack.streams.executionModeModal.finalDescription', {
                  defaultMessage:
                    "If selected, the new stream will receive incoming data permanently. You can't undo this.",
                })}
              </EuiText>
            </EuiCheckableCard>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel}>
              {i18n.translate('xpack.streams.executionModeModal.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() => onConfirm(isFinalDisabled || selectedMode === 'draft')}
              data-test-subj="streamsAppExecutionModeConfirmButton"
            >
              {i18n.translate('xpack.streams.executionModeModal.confirm', {
                defaultMessage: 'Confirm',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
