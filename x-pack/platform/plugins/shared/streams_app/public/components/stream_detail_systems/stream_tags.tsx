/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { convertGetResponseIntoUpsertRequest, type Streams } from '@kbn/streams-schema';
import React, { useState, useCallback } from 'react';
import { useUpdateStreams } from '../../hooks/use_update_streams';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';

const STREAM_TAGS_PANEL_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.streamTags.panelTitle',
  {
    defaultMessage: 'Stream tags',
  }
);

const STREAM_TAGS_HELP = i18n.translate('xpack.streams.streamDetailView.streamTags.helpText', {
  defaultMessage:
    'Tags help you organize and filter streams. Add descriptive tags for easy categorization.',
});

const STREAM_TAGS_PLACEHOLDER = i18n.translate(
  'xpack.streams.streamDetailView.streamTags.placeholder',
  {
    defaultMessage: 'Type and press Enter to add tags',
  }
);

const SAVE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamTags.saveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

const EDIT_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamTags.editButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

const CANCEL_LABEL = i18n.translate('xpack.streams.streamDetailView.streamTags.cancelButtonLabel', {
  defaultMessage: 'Cancel',
});

const NO_TAGS_LABEL = i18n.translate('xpack.streams.streamDetailView.streamTags.noTagsLabel', {
  defaultMessage: 'No tags set',
});

export interface StreamTagsPanelProps {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}

export const StreamTagsPanel: React.FC<StreamTagsPanelProps> = ({
  definition,
  refreshDefinition,
}) => {
  const [tags, setTags] = useState<string[]>(definition.stream.tags ?? []);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStream = useUpdateStreams(definition.stream.name);
  const canManage = definition.privileges.manage === true;

  const onStartEditing = useCallback(() => {
    setTags(definition.stream.tags ?? []);
    setIsEditing(true);
  }, [definition.stream.tags]);

  const onCancelEdit = useCallback(() => {
    setTags(definition.stream.tags ?? []);
    setIsEditing(false);
  }, [definition.stream.tags]);

  const onSaveTags = useCallback(async () => {
    setIsUpdating(true);
    try {
      const request = convertGetResponseIntoUpsertRequest(definition);
      request.stream.tags = tags.length > 0 ? tags : undefined;

      await updateStream(request);
      refreshDefinition();
      setIsEditing(false);
    } finally {
      setIsUpdating(false);
    }
  }, [tags, definition, updateStream, refreshDefinition]);

  const handleTagsChange = useCallback((options: EuiComboBoxOptionOption[]) => {
    setTags(options.map((option) => option.label));
  }, []);

  const handleTagCreate = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (trimmedValue && !tags.includes(trimmedValue)) {
        setTags((prevTags) => [...prevTags, trimmedValue]);
      }
    },
    [tags]
  );

  const currentTags = definition.stream.tags ?? [];
  const hasTags = currentTags.length > 0;

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{STREAM_TAGS_PANEL_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
        {isEditing ? (
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {STREAM_TAGS_HELP}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiComboBox
                data-test-subj="streamTagsPanelComboBox"
                fullWidth
                noSuggestions
                placeholder={STREAM_TAGS_PLACEHOLDER}
                selectedOptions={tags.map((tag) => ({ label: tag }))}
                onCreateOption={handleTagCreate}
                onChange={handleTagsChange}
                isDisabled={isUpdating}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup
                direction="row"
                gutterSize="s"
                justifyContent="flexEnd"
                alignItems="center"
              >
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    aria-label={CANCEL_LABEL}
                    size="s"
                    isLoading={isUpdating}
                    isDisabled={isUpdating}
                    onClick={onCancelEdit}
                    data-test-subj="streamTagsPanelCancelButton"
                  >
                    {CANCEL_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    iconType="save"
                    size="s"
                    iconSize="s"
                    fill
                    isLoading={isUpdating}
                    isDisabled={isUpdating}
                    onClick={onSaveTags}
                    data-test-subj="streamTagsPanelSaveButton"
                  >
                    {SAVE_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : (
          <Row
            left={
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {STREAM_TAGS_HELP}
                </EuiText>
              </EuiFlexItem>
            }
            right={
              <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                <EuiFlexItem>
                  {hasTags ? (
                    <EuiFlexGroup
                      gutterSize="xs"
                      wrap
                      responsive={false}
                      data-test-subj="streamTagsPanelDisplay"
                    >
                      {currentTags.map((tag) => (
                        <EuiFlexItem key={tag} grow={false}>
                          <EuiBadge data-test-subj={`streamTagsPanelBadge-${tag}`} color="hollow">
                            {tag}
                          </EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  ) : (
                    <EuiText size="s" color="subdued" data-test-subj="streamTagsPanelEmpty">
                      {NO_TAGS_LABEL}
                    </EuiText>
                  )}
                </EuiFlexItem>
                {canManage && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="pencil"
                      size="s"
                      iconSize="s"
                      isDisabled={isUpdating}
                      onClick={onStartEditing}
                      data-test-subj="streamTagsPanelEditButton"
                    >
                      {EDIT_BUTTON_LABEL}
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            }
          />
        )}
      </EuiPanel>
    </EuiPanel>
  );
};
