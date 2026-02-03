/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiPopover,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertGetResponseIntoUpsertRequest, type Streams } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const EMPTY_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.emptyDescriptionLabel',
  { defaultMessage: 'Add a description' }
);

const EDIT_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.editDescriptionLabel',
  { defaultMessage: 'Edit description' }
);

const SAVE_BUTTON_LABEL = i18n.translate('xpack.streams.streamDescription.saveButtonLabel', {
  defaultMessage: 'Save',
});

const CANCEL_BUTTON_LABEL = i18n.translate('xpack.streams.streamDescription.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

interface Props {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamDescription({ definition }: Props) {
  const { refresh } = useStreamDetail();
  const updateStream = useUpdateStreams(definition.stream.name);
  const [description, setDescription] = useState(definition.stream.description ?? '');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canManage = definition.privileges.manage === true;

  useEffect(() => {
    setDescription(definition.stream.description ?? '');
  }, [definition.stream.description]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const sanitized = description.trim();
      const request = convertGetResponseIntoUpsertRequest(definition);
      request.stream.description = sanitized;

      await updateStream(request);
      refresh();
      setIsPopoverOpen(false);
    } finally {
      setIsSaving(false);
    }
  }, [description, definition, updateStream, refresh]);

  const handleCancel = useCallback(() => {
    setDescription(definition.stream.description ?? '');
    setIsPopoverOpen(false);
  }, [definition.stream.description]);

  const hasDescription = Boolean(definition.stream.description);

  if (!canManage && !hasDescription) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="streamDescriptionEmpty">
        {EMPTY_DESCRIPTION_LABEL}
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false}>
      <EuiFlexItem grow={false}>
        {hasDescription ? (
          <EuiMarkdownFormat
            data-test-subj="streamDescriptionDisplay"
            textSize="xs"
            css={css`
              p {
                margin-bottom: 0;
              }
            `}
          >
            {definition.stream.description ?? ''}
          </EuiMarkdownFormat>
        ) : (
          <EuiText size="xs" color="subdued" data-test-subj="streamDescriptionPlaceholder">
            {EMPTY_DESCRIPTION_LABEL}
          </EuiText>
        )}
      </EuiFlexItem>
      {canManage && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            data-test-subj="streamDescriptionPopover"
            button={
              <EuiButtonIcon
                data-test-subj="streamDescriptionEditButton"
                iconType="pencil"
                aria-label={EDIT_DESCRIPTION_LABEL}
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                size="xs"
                color="text"
              />
            }
            isOpen={isPopoverOpen}
            closePopover={handleCancel}
            panelPaddingSize="s"
            anchorPosition="downLeft"
          >
            <div
              css={css`
                width: 400px;
              `}
            >
              <EuiMarkdownEditor
                data-test-subj="streamDescriptionEditor"
                aria-label={i18n.translate('xpack.streams.streamDescription.inputAriaLabel', {
                  defaultMessage: 'Edit Stream description',
                })}
                value={description}
                onChange={setDescription}
                height={200}
                placeholder={EMPTY_DESCRIPTION_LABEL}
              />
              <EuiFlexGroup
                justifyContent="flexEnd"
                gutterSize="s"
                css={css`
                  margin-top: 8px;
                `}
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streamDescriptionCancelButton"
                    size="s"
                    onClick={handleCancel}
                    isDisabled={isSaving}
                  >
                    {CANCEL_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streamDescriptionSaveButton"
                    size="s"
                    color="primary"
                    onClick={handleSave}
                    isLoading={isSaving}
                  >
                    {SAVE_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
