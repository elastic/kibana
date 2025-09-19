/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiLink,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  copyToClipboard,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';

export function StreamDeleteModal({
  onClose,
  onDelete,
  onCancel,
  name,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  name: string;
}) {
  const {
    core: { notifications },
  } = useKibana();

  const [isDeletingStream, setDeleteInProgress] = useState(false);
  const [streamName, setStreamName] = useState('');
  const modalTitleId = useGeneratedHtmlId();

  const handleDelete = async () => {
    try {
      setDeleteInProgress(true);
      await onDelete();
      setDeleteInProgress(false);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.streams.streamDetailRouting.deleted', {
          defaultMessage: 'Stream deleted',
        }),
      });
      onClose();
    } catch (error) {
      setDeleteInProgress(false);
      notifications.toasts.addError(error, {
        title: i18n.translate('xpack.streams.failedToDelete', {
          defaultMessage: 'Failed to delete stream {id}',
          values: {
            id: name,
          },
        }),
      });
    }
  };

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.title', {
            defaultMessage: 'Delete {stream} ?',
            values: { stream: name },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          color="warning"
          iconType="warning"
          title={
            <FormattedMessage
              id="xpack.streams.streamDetailView.deleteStreamModal.warningText"
              defaultMessage="This action cannot be undone and permanently deletes the {stream} stream and all its contents."
              values={{
                stream: (
                  <EuiLink
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.currentTarget.blur();
                      copyToClipboard(name);
                    }}
                  >
                    {name} <EuiIcon type="copy" />
                  </EuiLink>
                ),
              }}
            />
          }
        />

        <EuiSpacer size="m" />

        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.streams.streamDetailView.deleteStreamModal.confirmationInputLabel',
            {
              defaultMessage: 'Type the stream name to confirm',
            }
          )}
        >
          <EuiFieldText
            data-test-subj="streamsAppDeleteStreamModalStreamNameInput"
            onChange={(e) => setStreamName(e.target.value)}
            fullWidth
            name={'stream-name-deletion'}
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty isDisabled={isDeletingStream} onClick={onCancel}>
          {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          isDisabled={streamName !== name}
          isLoading={isDeletingStream}
          color="danger"
          onClick={handleDelete}
          fill
        >
          {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.deleteButton', {
            defaultMessage: 'Delete',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
