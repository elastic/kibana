/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiMarkdownEditor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DescriptionGenerationTaskResult } from '@kbn/streams-plugin/server/routes/internal/streams/description_generation/route';
import React, { useCallback } from 'react';
import type { AIFeatures } from '../../../../hooks/use_ai_features';
import { DescriptionGenerationControl } from '../../../stream_detail_systems/stream_description/description_generation_control';
import { Row, RowMetadata } from './row';

const STREAM_TAGS_LABEL = i18n.translate('xpack.streams.streamMetadataForm.tags.label', {
  defaultMessage: 'Tags',
});

const STREAM_TAGS_HELP = i18n.translate('xpack.streams.streamMetadataForm.tags.helpText', {
  defaultMessage:
    'Tags help you organize and filter streams. Add descriptive tags for easy categorization.',
});

const STREAM_TAGS_PLACEHOLDER = i18n.translate(
  'xpack.streams.streamMetadataForm.tags.placeholder',
  {
    defaultMessage: 'Type and press Enter to add tags',
  }
);

const STREAM_DESCRIPTION_LABEL = i18n.translate(
  'xpack.streams.streamMetadataForm.description.label',
  {
    defaultMessage: 'Description',
  }
);

const STREAM_DESCRIPTION_HELP = i18n.translate(
  'xpack.streams.streamMetadataForm.description.helpText',
  {
    defaultMessage:
      'This is a natural language description of your data. This will be used in AI workflows like feature identification and significant event generation. Generation uses the last 24 hours of data.',
  }
);

const STREAM_DESCRIPTION_PLACEHOLDER = i18n.translate(
  'xpack.streams.streamMetadataForm.description.placeholder',
  {
    defaultMessage: 'No description',
  }
);

export interface StreamMetadataFormProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  description?: string;
  onDescriptionChange?: (value: string) => void;
  showDescription?: boolean;
  disabled?: boolean;
  canManage: boolean;
  // AI generation props for description
  aiFeatures?: AIFeatures | null;
  isTaskLoading?: boolean;
  task?: DescriptionGenerationTaskResult;
  taskError?: Error;
  refreshTask?: () => Promise<DescriptionGenerationTaskResult>;
  getDescriptionGenerationStatus?: () => Promise<DescriptionGenerationTaskResult>;
  scheduleDescriptionGenerationTask?: (connectorId: string) => Promise<void>;
  cancelDescriptionGenerationTask?: () => Promise<void>;
}

export const StreamMetadataForm: React.FC<StreamMetadataFormProps> = ({
  tags,
  onTagsChange,
  description,
  onDescriptionChange,
  showDescription = false,
  disabled = false,
  canManage,
  aiFeatures,
  isTaskLoading,
  task,
  taskError,
  refreshTask,
  getDescriptionGenerationStatus,
  scheduleDescriptionGenerationTask,
  cancelDescriptionGenerationTask,
}) => {
  const handleTagsChange = useCallback(
    (options: EuiComboBoxOptionOption[]) => {
      onTagsChange(options.map((option) => option.label));
    },
    [onTagsChange]
  );

  const handleTagCreate = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      if (trimmedValue && !tags.includes(trimmedValue)) {
        onTagsChange([...tags, trimmedValue]);
      }
    },
    [tags, onTagsChange]
  );

  const areButtonsDisabled =
    disabled ||
    isTaskLoading ||
    task?.status === 'in_progress' ||
    task?.status === 'being_canceled';

  return (
    <>
      <Row
        left={<RowMetadata label={STREAM_TAGS_LABEL} description={STREAM_TAGS_HELP} />}
        right={
          <EuiFormRow fullWidth>
            <EuiComboBox
              data-test-subj="streamMetadataFormTagsInput"
              fullWidth
              noSuggestions
              placeholder={STREAM_TAGS_PLACEHOLDER}
              selectedOptions={tags.map((tag) => ({ label: tag }))}
              onCreateOption={handleTagCreate}
              onChange={handleTagsChange}
              isDisabled={disabled || !canManage}
            />
          </EuiFormRow>
        }
      />

      {showDescription && onDescriptionChange && (
        <>
          <EuiHorizontalRule margin="m" />

          <Row
            left={
              <RowMetadata label={STREAM_DESCRIPTION_LABEL} description={STREAM_DESCRIPTION_HELP} />
            }
            right={
              <EuiFlexGroup direction="column" gutterSize="m">
                <EuiFlexItem>
                  <EuiMarkdownEditor
                    data-test-subj="streamMetadataFormDescriptionInput"
                    value={description ?? ''}
                    onChange={onDescriptionChange}
                    aria-labelledby="stream-description-editor"
                    placeholder={STREAM_DESCRIPTION_PLACEHOLDER}
                    readOnly={areButtonsDisabled || !canManage}
                    toolbarProps={{
                      right:
                        aiFeatures &&
                        scheduleDescriptionGenerationTask &&
                        cancelDescriptionGenerationTask &&
                        refreshTask &&
                        getDescriptionGenerationStatus ? (
                          <EuiFlexGroup
                            direction="row"
                            gutterSize="s"
                            justifyContent="flexEnd"
                            alignItems="center"
                          >
                            <EuiFlexItem grow={false}>
                              <DescriptionGenerationControl
                                isTaskLoading={isTaskLoading ?? false}
                                task={task}
                                taskError={taskError}
                                refreshTask={refreshTask}
                                getDescriptionGenerationStatus={getDescriptionGenerationStatus}
                                scheduleDescriptionGenerationTask={
                                  scheduleDescriptionGenerationTask
                                }
                                cancelDescriptionGenerationTask={cancelDescriptionGenerationTask}
                                aiFeatures={aiFeatures}
                                disabled={areButtonsDisabled}
                              />
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        ) : undefined,
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
          />
        </>
      )}
    </>
  );
};
