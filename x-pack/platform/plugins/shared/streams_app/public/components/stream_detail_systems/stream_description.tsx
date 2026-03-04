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
  EuiPanel,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useStreamDescriptionApi } from './stream_description/use_stream_description_api';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { DescriptionGenerationControl } from './stream_description/description_generation_control';

export interface AISummaryProps {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
  aiFeatures: AIFeatures | null;
}

const STREAM_DESCRIPTION_PANEL_TITLE = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.panelTitle',
  {
    defaultMessage: 'Stream description',
  }
);

const STREAM_DESCRIPTION_HELP = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.helpText',
  {
    defaultMessage:
      'This is a natural language description of your data. This will be used in AI workflows like feature identification and significant event generation. Generation uses the last 24 hours of data.',
  }
);

const STREAM_DESCRIPTION_EMPTY = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.emptyText',
  {
    defaultMessage: 'No description',
  }
);

const SAVE_DESCRIPTION_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.saveDescriptionButtonLabel',
  {
    defaultMessage: 'Save',
  }
);

const EDIT_DESCRIPTION_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.editDescriptionButtonLabel',
  {
    defaultMessage: 'Edit',
  }
);

const MANUAL_ENTRY_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.manualEntryButtonLabel',
  {
    defaultMessage: 'Enter manually',
  }
);

const CANCEL_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.cancelButtonLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const StreamDescription: React.FC<AISummaryProps> = ({
  definition,
  refreshDefinition,
  aiFeatures,
}) => {
  const {
    description,
    isUpdating,
    isEditing,
    setDescription,
    onCancelEdit,
    onSaveDescription,
    onStartEditing,
    isTaskLoading,
    task,
    taskError,
    refreshTask,
    getDescriptionGenerationStatus,
    scheduleDescriptionGenerationTask,
    cancelDescriptionGenerationTask,
    areButtonsDisabled,
  } = useStreamDescriptionApi({ definition, refreshDefinition });

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{STREAM_DESCRIPTION_PANEL_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
        {definition.stream.description || description || isEditing ? (
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiText size="s" color="subdued">
              {STREAM_DESCRIPTION_HELP}
            </EuiText>
            <EuiMarkdownEditor
              value={description}
              onChange={setDescription}
              aria-labelledby="stream-description-editor"
              placeholder={STREAM_DESCRIPTION_EMPTY}
              readOnly={areButtonsDisabled || !isEditing}
              toolbarProps={{
                right: (
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    justifyContent="flexEnd"
                    alignItems="center"
                  >
                    {isEditing && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          aria-label={CANCEL_LABEL}
                          size="s"
                          isLoading={isUpdating}
                          isDisabled={areButtonsDisabled}
                          onClick={onCancelEdit}
                          data-test-subj="stream_description_cancel_edit_button"
                        >
                          {CANCEL_LABEL}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <EuiButton
                        iconType={isEditing ? 'save' : 'pencil'}
                        size="s"
                        iconSize="s"
                        fill
                        isLoading={isUpdating}
                        isDisabled={areButtonsDisabled}
                        onClick={() => {
                          if (!isEditing) {
                            onStartEditing();
                          } else {
                            onSaveDescription();
                          }
                        }}
                        data-test-subj={
                          isEditing
                            ? 'stream_description_edit_button'
                            : 'stream_description_save_button'
                        }
                      >
                        {isEditing ? SAVE_DESCRIPTION_BUTTON_LABEL : EDIT_DESCRIPTION_BUTTON_LABEL}
                      </EuiButton>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <DescriptionGenerationControl
                        isTaskLoading={isTaskLoading}
                        task={task}
                        taskError={taskError}
                        refreshTask={refreshTask}
                        getDescriptionGenerationStatus={getDescriptionGenerationStatus}
                        scheduleDescriptionGenerationTask={scheduleDescriptionGenerationTask}
                        cancelDescriptionGenerationTask={cancelDescriptionGenerationTask}
                        aiFeatures={aiFeatures}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
              }}
            />
          </EuiFlexGroup>
        ) : (
          <Row
            left={
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued">
                  {STREAM_DESCRIPTION_HELP}
                </EuiText>
              </EuiFlexItem>
            }
            right={
              <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButton
                    isLoading={isUpdating}
                    isDisabled={areButtonsDisabled}
                    onClick={onStartEditing}
                    data-test-subj="stream_description_manual_entry_button"
                  >
                    {MANUAL_ENTRY_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DescriptionGenerationControl
                    isTaskLoading={isTaskLoading}
                    task={task}
                    taskError={taskError}
                    refreshTask={refreshTask}
                    getDescriptionGenerationStatus={getDescriptionGenerationStatus}
                    scheduleDescriptionGenerationTask={scheduleDescriptionGenerationTask}
                    cancelDescriptionGenerationTask={cancelDescriptionGenerationTask}
                    aiFeatures={aiFeatures}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        )}
      </EuiPanel>
    </EuiPanel>
  );
};
