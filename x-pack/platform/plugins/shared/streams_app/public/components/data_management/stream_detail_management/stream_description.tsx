/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
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
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';

export interface AISummaryProps {
  definition: Streams.all.GetResponse;
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
      'A description of the data in the stream. This will be used for AI features like system identification and significant events.',
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

export const StreamDescription: React.FC<AISummaryProps> = ({ definition }) => {
  const { save, generate, isGenerating, description, isUpdating, isEditing, setDescription } =
    useStreamDescriptionApi({ definition });

  return (
    <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
      <EuiPanel hasShadow={false} color="subdued">
        <EuiText size="s">
          <h3>{STREAM_DESCRIPTION_PANEL_TITLE}</h3>
        </EuiText>
      </EuiPanel>
      <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiText size="s">{STREAM_DESCRIPTION_HELP}</EuiText>
          {definition.stream.description ? (
            <EuiMarkdownEditor
              value={description}
              onChange={(next) => {
                setDescription(next);
              }}
              aria-labelledby="stream-description-editor"
              placeholder={STREAM_DESCRIPTION_EMPTY}
              readOnly={isGenerating || isUpdating || !isEditing}
              toolbarProps={{
                right: (
                  <EuiFlexGroup
                    direction="row"
                    gutterSize="s"
                    justifyContent="flexEnd"
                    alignItems="center"
                  >
                    <EuiFlexItem grow={false}>
                      <ConnectorListButton
                        buttonProps={{
                          size: 's',
                          iconType: 'sparkles',
                          children: GENERATE_DESCRIPTION_BUTTON_LABEL,
                          onClick() {
                            generate();
                          },
                          isDisabled: isGenerating || isUpdating,
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
                        isDisabled={isUpdating || isGenerating}
                        onClick={() => {
                          save(description);
                        }}
                      >
                        {isEditing ? SAVE_DESCRIPTION_BUTTON_LABEL : EDIT_DESCRIPTION_BUTTON_LABEL}
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ),
              }}
            />
          ) : null}
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
