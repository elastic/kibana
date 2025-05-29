/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiListGroup,
  EuiListGroupItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';

export function StreamDeleteModal({
  onClose,
  onDelete,
  onCancel,
  name,
  relatedStreams,
}: {
  onClose: () => void;
  onDelete: () => Promise<void>;
  onCancel: () => void;
  name: string;
  relatedStreams: string[];
}) {
  const {
    core: { notifications },
  } = useKibana();
  const router = useStreamsAppRouter();

  const [isDeletingStream, setDeleteInProgress] = useState(false);
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
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.streams.streamDetailRouting.deleteModalTitle', {
            defaultMessage: 'Are you sure you want to delete this data stream?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText>
            {i18n.translate('xpack.streams.streamDetailRouting.deleteModalDescription', {
              defaultMessage:
                'Deleting this stream will remove all of its children and the data will no longer be routed. All existing data will be removed as well.',
            })}
          </EuiText>
          {relatedStreams.length > 1 && (
            <>
              <EuiText>
                {i18n.translate('xpack.streams.streamDetailRouting.deleteModalStreams', {
                  defaultMessage: 'The following streams will be deleted:',
                })}
              </EuiText>
              <EuiListGroup flush={true} maxWidth={false}>
                {relatedStreams.map((stream) => (
                  <EuiListGroupItem
                    key={stream}
                    target="_blank"
                    href={router.link('/{key}/management/{tab}', {
                      path: {
                        key: stream,
                        tab: 'route',
                      },
                    })}
                    label={stream}
                  />
                ))}
              </EuiListGroup>
            </>
          )}
        </EuiFlexGroup>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiButtonEmpty
            data-test-subj="streamsAppStreamDetailRoutingCancelButton"
            onClick={onCancel}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.deleteModalCancel', {
              defaultMessage: 'Cancel',
            })}
          </EuiButtonEmpty>
          <EuiButton
            data-test-subj="streamsAppStreamDetailRoutingDeleteButton"
            color="danger"
            fill
            onClick={handleDelete}
            isLoading={isDeletingStream}
          >
            {i18n.translate('xpack.streams.streamDetailRouting.delete', {
              defaultMessage: 'Delete',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
