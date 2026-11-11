/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
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
    <EuiEmptyPrompt
      data-test-subj="streamsAppAttachmentsEmptyPrompt"
      color="plain"
      css={css`
        && {
          max-width: 400px;
          align-self: center;
        }
      `}
      icon={<AssetImage type="attachmentsEmpty" size={140} />}
      title={
        <h2>
          {i18n.translate('xpack.streams.attachments.emptyState.title', {
            defaultMessage: 'No attachments added',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.streams.attachments.emptyState.description', {
            defaultMessage:
              'Add relevant attachments to your stream so you can access them from one place',
          })}
        </p>
      }
      actions={
        <EuiButton
          color="primary"
          fill
          data-test-subj="streamsAppAttachmentsEmptyStateAddButton"
          onClick={onAddAttachments}
          isDisabled={disabled}
        >
          {i18n.translate('xpack.streams.attachments.emptyState.addAttachmentsButtonLabel', {
            defaultMessage: 'Add attachments',
          })}
        </EuiButton>
      }
    />
  );
}
