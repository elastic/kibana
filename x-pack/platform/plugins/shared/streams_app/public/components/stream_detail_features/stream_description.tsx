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
import { ConnectorListButton } from '../connector_list_button/connector_list_button';
import { useStreamDescriptionApi } from './stream_description/use_stream_description_api';
import { Row } from '../data_management/stream_detail_management/advanced_view/row';

export interface AISummaryProps {
  definition: Streams.all.GetResponse;
  refreshDefinition: () => void;
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
      'This is a natural language description of your data. This will be used in AI workflows like feature identification and significant event generation.',
  }
);

const STREAM_DESCRIPTION_EMPTY = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.emptyText',
  {
    defaultMessage: 'No description',
  }
);

const GENERATE_DESCRIPTION_BUTTON_LABEL = i18n.translate(
  'xpack.streams.streamDetailView.streamDescription.generateButtonLabel',
  {
    defaultMessage: 'Generate description',
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

export const StreamDescription: React.FC<AISummaryProps> = ({ definition, refreshDefinition }) => {
  const {
    isGenerating,
    description,
    isUpdating,
    isEditing,
    setDescription,
    onCancelEdit,
    onGenerateDescription,
    onSaveDescription,
    onStartEditing,
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
                        >
                          {CANCEL_LABEL}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      <ConnectorListButton
                        buttonProps={{
                          size: 's',
                          iconType: 'sparkles',
                          children: GENERATE_DESCRIPTION_BUTTON_LABEL,
                          onClick: onGenerateDescription,
                          isDisabled: areButtonsDisabled,
                          isLoading: isGenerating,
                        }}
                      />
                    </EuiFlexItem>
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
                      >
                        {isEditing ? SAVE_DESCRIPTION_BUTTON_LABEL : EDIT_DESCRIPTION_BUTTON_LABEL}
                      </EuiButton>
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
                  >
                    {MANUAL_ENTRY_BUTTON_LABEL}
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <ConnectorListButton
                    buttonProps={{
                      fill: true,
                      size: 'm',
                      iconType: 'sparkles',
                      children: GENERATE_DESCRIPTION_BUTTON_LABEL,
                      onClick: onGenerateDescription,
                      isDisabled: areButtonsDisabled,
                      isLoading: isGenerating,
                    }}
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
