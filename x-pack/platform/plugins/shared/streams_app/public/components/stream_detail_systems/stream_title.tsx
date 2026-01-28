/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
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

const STREAM_TITLE_PANEL_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.streamTitle.panelTitle',
  {
    defaultMessage: 'Stream title',
  }
);

const STREAM_TITLE_HELP = i18n.translate('xpack.streams.streamDetailView.streamTitle.helpText', {
  defaultMessage:
    'A human-friendly title for this stream. This will be displayed prominently in the UI.',
});

const STREAM_TITLE_PLACEHOLDER = i18n.translate(
  'xpack.streams.streamDetailView.streamTitle.placeholder',
  {
    defaultMessage: 'Enter a title for this stream',
  }
);

const SAVE_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamTitle.saveButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

const EDIT_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamTitle.editButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

const CANCEL_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamTitle.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

const NO_TITLE_LABEL = i18n.translate('xpack.streams.streamDetailView.streamTitle.noTitleLabel', {
  defaultMessage: 'No title set',
});

export interface StreamTitlePanelProps {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
}

export const StreamTitlePanel: React.FC<StreamTitlePanelProps> = ({
  definition,
  refreshDefinition,
}) => {
  const [title, setTitle] = useState(definition.stream.title ?? '');
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStream = useUpdateStreams(definition.stream.name);
  const canManage = definition.privileges.manage === true;

  const onStartEditing = useCallback(() => {
    setTitle(definition.stream.title ?? '');
    setIsEditing(true);
  }, [definition.stream.title]);

  const onCancelEdit = useCallback(() => {
    setTitle(definition.stream.title ?? '');
    setIsEditing(false);
  }, [definition.stream.title]);

  const onSaveTitle = useCallback(async () => {
    setIsUpdating(true);
    try {
      const sanitized = title.trim();
      const request = convertGetResponseIntoUpsertRequest(definition);
      request.stream.title = sanitized || undefined;

      await updateStream(request);
      refreshDefinition();
      setIsEditing(false);
    } finally {
      setIsUpdating(false);
    }
  }, [title, definition, updateStream, refreshDefinition]);

  const displayTitle = definition.stream.title || NO_TITLE_LABEL;

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{STREAM_TITLE_PANEL_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
        {isEditing ? (
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {STREAM_TITLE_HELP}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFieldText
                data-test-subj="streamTitlePanelInput"
                fullWidth
                placeholder={STREAM_TITLE_PLACEHOLDER}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUpdating}
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
                    data-test-subj="streamTitlePanelCancelButton"
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
                    onClick={onSaveTitle}
                    data-test-subj="streamTitlePanelSaveButton"
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
                  {STREAM_TITLE_HELP}
                </EuiText>
              </EuiFlexItem>
            }
            right={
              <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                <EuiFlexItem>
                  <EuiText
                    size="s"
                    color={definition.stream.title ? 'default' : 'subdued'}
                    data-test-subj="streamTitlePanelDisplay"
                  >
                    {displayTitle}
                  </EuiText>
                </EuiFlexItem>
                {canManage && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      iconType="pencil"
                      size="s"
                      iconSize="s"
                      isDisabled={isUpdating}
                      onClick={onStartEditing}
                      data-test-subj="streamTitlePanelEditButton"
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
