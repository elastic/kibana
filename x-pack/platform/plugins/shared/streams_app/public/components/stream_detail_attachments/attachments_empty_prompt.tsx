/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AssetImage } from '../asset_image';

interface AttachmentsEmptyPromptProps {
  onAddAttachments: () => void;
  disabled?: boolean;
}

export function AttachmentsEmptyPrompt({
  onAddAttachments,
  disabled,
}: AttachmentsEmptyPromptProps) {
  return (
    <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
      <EuiFlexItem grow={false}>
        <AssetImage type="attachmentsEmpty" size="m" />
        <EuiFlexGroup direction="column" alignItems="center" gutterSize="s">
          <EuiText size="m" css={{ fontWeight: 'bold' }}>
            {i18n.translate('xpack.streams.attachments.emptyState.title', {
              defaultMessage: 'No attachments have been added',
            })}
          </EuiText>
          <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
            {i18n.translate('xpack.streams.attachments.emptyState.description', {
              defaultMessage:
                'Add relevant attachments to your stream so you can access them from one place',
            })}
          </EuiText>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          data-test-subj="streamsAppAttachmentsEmptyStateAddButton"
          onClick={onAddAttachments}
          disabled={disabled}
        >
          {i18n.translate('xpack.streams.attachments.emptyState.addAttachmentsButtonLabel', {
            defaultMessage: 'Add attachments',
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
