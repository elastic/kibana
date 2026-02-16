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
  EuiFlexItem,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiTab,
  EuiTabs,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertGetResponseIntoUpsertRequest, type Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { useStreamDetail } from '../../hooks/use_stream_detail';
import { useUpdateStreams } from '../../hooks/use_update_streams';

const EMPTY_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamDescription.emptyDescriptionLabel',
  { defaultMessage: 'Add a description' }
);

const NO_DESCRIPTION_LABEL = i18n.translate('xpack.streams.streamDescription.noDescriptionLabel', {
  defaultMessage: 'No description',
});

const PREVIEW_TAB_LABEL = i18n.translate('xpack.streams.streamDescription.previewTabLabel', {
  defaultMessage: 'Preview',
});

const EDITOR_TAB_LABEL = i18n.translate('xpack.streams.streamDescription.editorTabLabel', {
  defaultMessage: 'Editor',
});

const SAVE_LABEL = i18n.translate('xpack.streams.streamDescription.saveButtonLabel', {
  defaultMessage: 'Save',
});

const CANCEL_LABEL = i18n.translate('xpack.streams.streamDescription.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

interface Props {
  definition: Streams.ingest.all.GetResponse;
}

export function StreamDescription({ definition }: Props) {
  const { refresh } = useStreamDetail();
  const updateStream = useUpdateStreams(definition.stream.name);
  const canManage = definition.privileges.manage === true;

  const savedDescription = definition.stream.description ?? '';

  const [selectedTab, setSelectedTab] = useState<'preview' | 'editor'>('preview');
  const [description, setDescription] = useState(savedDescription);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDescription(savedDescription);
  }, [savedDescription]);

  const sanitizedDescription = description.trim();
  const sanitizedSavedDescription = savedDescription.trim();
  const hasChanges = sanitizedDescription !== sanitizedSavedDescription;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="streamDescription">
      <EuiFlexItem grow={false}>
        <EuiTabs size="s">
          <EuiTab
            onClick={() => setSelectedTab('preview')}
            isSelected={selectedTab === 'preview'}
            data-test-subj="streamDescriptionTabPreview"
          >
            {PREVIEW_TAB_LABEL}
          </EuiTab>
          <EuiTab
            onClick={() => setSelectedTab('editor')}
            isSelected={selectedTab === 'editor'}
            data-test-subj="streamDescriptionTabEditor"
          >
            {EDITOR_TAB_LABEL}
          </EuiTab>
        </EuiTabs>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        {selectedTab === 'preview' ? (
          sanitizedDescription.length > 0 ? (
            <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
          ) : (
            <EuiText size="s" color="subdued">
              <p>{canManage ? EMPTY_DESCRIPTION_LABEL : NO_DESCRIPTION_LABEL}</p>
            </EuiText>
          )
        ) : (
          <EuiMarkdownEditor
            data-test-subj="streamDescriptionMarkdownEditor"
            value={description}
            onChange={setDescription}
            aria-labelledby="stream-description-editor"
            placeholder={EMPTY_DESCRIPTION_LABEL}
            readOnly={!canManage}
          />
        )}
      </EuiFlexItem>

      {canManage && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="s" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                isDisabled={!hasChanges || isSaving}
                onClick={() => {
                  setDescription(savedDescription);
                  setSelectedTab('preview');
                }}
                data-test-subj="streamDescriptionCancelButton"
              >
                {CANCEL_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                isLoading={isSaving}
                isDisabled={!hasChanges || isSaving}
                onClick={async () => {
                  const request = convertGetResponseIntoUpsertRequest(definition);
                  request.stream.description = sanitizedDescription;

                  setIsSaving(true);
                  try {
                    await updateStream(request);
                    refresh();
                    setSelectedTab('preview');
                  } finally {
                    setIsSaving(false);
                  }
                }}
                data-test-subj="streamDescriptionSaveButton"
              >
                {SAVE_LABEL}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
