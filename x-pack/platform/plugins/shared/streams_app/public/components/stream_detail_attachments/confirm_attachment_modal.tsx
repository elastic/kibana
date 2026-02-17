/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  Attachment,
  AttachmentType,
} from '@kbn/streams-plugin/server/lib/streams/attachments/types';
import React, { useMemo } from 'react';
import { AttachmentTypeBadge } from './attachment_type_badge';

interface ConfirmAttachmentModalProps {
  attachments: Attachment[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmAttachmentModal({
  attachments,
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmAttachmentModalProps) {
  const { euiTheme } = useEuiTheme();

  const title = i18n.translate('xpack.streams.confirmAttachmentModal.title', {
    defaultMessage: 'Confirm changes',
  });

  const subtitle = i18n.translate('xpack.streams.confirmAttachmentModal.removeSubtitle', {
    defaultMessage:
      'Are you sure you want to remove {count, plural, one {this attachment} other {these attachments}}?',
    values: { count: attachments.length },
  });

  const confirmButtonText = i18n.translate('xpack.streams.confirmAttachmentModal.removeButton', {
    defaultMessage: 'Remove from stream',
  });

  const columns = useMemo(
    () => [
      {
        field: 'title',
        name: i18n.translate('xpack.streams.confirmAttachmentModal.nameColumn', {
          defaultMessage: 'Name',
        }),
        truncateText: true,
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.confirmAttachmentModal.typeColumn', {
          defaultMessage: 'Type',
        }),
        render: (type: AttachmentType) => <AttachmentTypeBadge type={type} />,
        width: '150px',
      },
    ],
    []
  );

  const tableContainerStyles = css`
    max-height: 300px;
    overflow: auto;

    & thead {
      position: sticky;
      top: 0;
      background-color: ${euiTheme.colors.backgroundBasePlain};
      z-index: 1;
    }
  `;

  return (
    <EuiModal onClose={onCancel} aria-label={title} maxWidth={600}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>{subtitle}</EuiText>
        <EuiSpacer size="m" />
        <EuiCallOut
          announceOnMount
          color="warning"
          iconType="warning"
          title={i18n.translate('xpack.streams.confirmAttachmentModal.unlinkWarning', {
            defaultMessage:
              'Removing an attachment only removes its connection to the stream. It does not delete the underlying object.',
          })}
        />
        <EuiSpacer size="m" />
        <EuiBasicTable
          css={tableContainerStyles}
          tableCaption={i18n.translate('xpack.streams.confirmAttachmentModal.tableCaption', {
            defaultMessage: 'List of attachments to remove',
          })}
          items={attachments}
          columns={columns}
          data-test-subj="streamsAppConfirmAttachmentModalTable"
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onCancel}
          disabled={isLoading}
          data-test-subj="streamsAppConfirmAttachmentModalCancelButton"
        >
          {i18n.translate('xpack.streams.confirmAttachmentModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          color="primary"
          onClick={onConfirm}
          isLoading={isLoading}
          data-test-subj="streamsAppConfirmAttachmentModalConfirmButton"
        >
          {confirmButtonText}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
