/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiIcon, EuiLoadingSpinner, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AttachmentTile } from './attachment_tile';
import { getFileTypeLabel, resolveFileMimeType } from './file_type';

const readingLabel = i18n.translate('xpack.agentBuilder.fileAttachmentPill.readingLabel', {
  defaultMessage: 'Reading file...',
});

export interface FileAttachmentPillProps {
  attachmentId: string;
  /** The file name, shown in the tooltip. */
  name: string;
  /** The stored mime type. Taken from the file name when the file has no data yet. */
  mimeType?: string;
  isLoading?: boolean;
  onRemoveAttachment?: () => void;
  isHighlighted?: boolean;
}

/** A tile for a file, the size of an image tile: the document icon and the file type. */
export const FileAttachmentPill: React.FC<FileAttachmentPillProps> = ({
  attachmentId,
  name,
  mimeType,
  isLoading = false,
  onRemoveAttachment,
  isHighlighted = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const resolvedMimeType = resolveFileMimeType({ name, mimeType });
  const typeLabel = resolvedMimeType ? getFileTypeLabel(resolvedMimeType) : undefined;

  return (
    <EuiToolTip content={isLoading ? readingLabel : name} disableScreenReaderOutput>
      <AttachmentTile
        attachmentId={attachmentId}
        data-test-subj={
          isLoading
            ? `agentBuilderLoadingFilePill-${attachmentId}`
            : `agentBuilderAttachmentPill-${attachmentId}`
        }
        onRemoveAttachment={onRemoveAttachment}
        isHighlighted={isHighlighted}
      >
        <div
          role={isLoading ? 'status' : 'img'}
          aria-label={isLoading ? readingLabel : name}
          css={css`
            display: flex;
            align-items: center;
            justify-content: center;
            gap: ${euiTheme.size.xs};
            width: 100%;
            height: 100%;

            [data-removable='true']:hover > & {
              opacity: 0;
            }
          `}
        >
          {isLoading ? (
            <EuiLoadingSpinner size="m" />
          ) : (
            <EuiIcon type="document" size="m" color="primary" aria-hidden={true} />
          )}
          {typeLabel && (
            <EuiText size="xs" aria-hidden={true}>
              <strong>{typeLabel}</strong>
            </EuiText>
          )}
        </div>
      </AttachmentTile>
    </EuiToolTip>
  );
};
