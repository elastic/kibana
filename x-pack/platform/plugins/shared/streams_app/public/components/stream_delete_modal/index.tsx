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
  EuiCopy,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { buildRequestPreviewCodeContent } from '../data_management/shared/utils';
import { getFormattedError } from '../../util/errors';

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
      notifications.toasts.addError(getFormattedError(error), {
        title: i18n.translate('xpack.streams.failedToDelete', {
          defaultMessage: 'Failed to delete stream {id}',
          values: {
            id: name,
          },
        }),
      });
    }
  };

  const copyCodeContent = React.useMemo(() => {
    return buildRequestPreviewCodeContent({
      method: 'DELETE',
      url: `/api/streams/${name}`,
    });
  }, [name]);

  return (
    <EuiModal aria-labelledby={modalTitleId} onClose={onClose}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.title', {
            defaultMessage: 'Are you sure you want to delete {stream} ?',
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
              defaultMessage="This action cannot be undone and permanently deletes the {stream} stream and all its contents. This action cannot be undone."
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
              defaultMessage: 'To confirm, type {stream}',
              values: { stream: name },
            }
          )}
        >
          <EuiFieldText
            data-test-subj="streamsAppDeleteStreamModalStreamNameInput"
            onChange={(e) => setStreamName(e.target.value)}
            fullWidth
            name={'stream-name-deletion'}
            autoFocus
          />
        </EuiFormRow>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={copyCodeContent}>
              {(copy) => (
                <EuiButtonEmpty
                  data-test-subj="streamsAppDeleteStreamModalCopyCodeButton"
                  size="s"
                  iconType="editorCodeBlock"
                  onClick={copy}
                >
                  {copyCodeButtonText}
                </EuiButtonEmpty>
              )}
            </EuiCopy>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="m">
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
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}

const copyCodeButtonText = i18n.translate(
  'xpack.streams.streamDetailView.deleteStreamModal.copyCodeButton',
  { defaultMessage: 'Copy API request' }
);
