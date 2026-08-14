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
  EuiText,
  copyToClipboard,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { buildRequestPreviewCodeContent } from '../stream_management/data_management/shared/utils';
import { getFormattedError } from '../../util/errors';

export function StreamDeleteModal({
  onClose,
  onDelete,
  onCancel,
  name,
  variant = 'default',
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  name: string;
  variant?: 'default' | 'query';
}) {
  const {
    core: { notifications },
  } = useKibana();

  const [isDeletingStream, setDeleteInProgress] = useState(false);
  const [streamName, setStreamName] = useState('');
  const modalTitleId = useGeneratedHtmlId();
  const isQueryStream = variant === 'query';

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
          {isQueryStream
            ? i18n.translate('xpack.streams.streamDetailView.deleteQueryStreamModal.title', {
                defaultMessage: 'Are you sure you want to delete the Query Stream {stream}?',
                values: { stream: name },
              })
            : i18n.translate('xpack.streams.streamDetailView.deleteStreamModal.title', {
                defaultMessage: 'Are you sure you want to delete {stream} ?',
                values: { stream: name },
              })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiCallOut
          color={isQueryStream ? 'primary' : 'warning'}
          iconType={isQueryStream ? 'iInCircle' : 'warning'}
          data-test-subj="streamsAppDeleteStreamModalCallout"
          title={
            isQueryStream ? (
              <FormattedMessage
                id="xpack.streams.streamDetailView.deleteQueryStreamModal.infoTitle"
                defaultMessage="Query Streams are read-only. Deleting this Query Stream only removes its saved configuration."
              />
            ) : (
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
                      {name} <EuiIcon type="copy" aria-hidden={true} />
                    </EuiLink>
                  ),
                }}
              />
            )
          }
        />

        {isQueryStream && (
          <>
            <EuiSpacer size="s" />
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.streams.streamDetailView.deleteQueryStreamModal.infoBody"
                  defaultMessage="Query Streams read data from CPS-connected source streams. Deleting {stream} removes its saved query string and stream configuration, but does not delete indexed data."
                  values={{ stream: name }}
                />
              </p>
            </EuiText>
          </>
        )}

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
                  iconType="code"
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
                data-test-subj="streamsAppDeleteStreamModalDeleteButton"
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
