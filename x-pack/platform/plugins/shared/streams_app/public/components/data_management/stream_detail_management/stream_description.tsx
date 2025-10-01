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
import { useAbortController } from '@kbn/react-hooks';
import { Streams } from '@kbn/streams-schema';
import { isEmpty, omit } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';
import { useTimefilter } from '../../../hooks/use_timefilter';
import { useUpdateStreams } from '../../../hooks/use_update_streams';
import { ConnectorListButton } from '../../connector_list_button/connector_list_button';
import { useAIFeatures } from '../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';

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

export const StreamDescription: React.FC<AISummaryProps> = ({ definition }) => {
  const updateStream = useUpdateStreams(definition.stream.name);

  const {
    core: { notifications },
    dependencies: {
      start: { streams },
    },
  } = useKibana();

  const { timeState } = useTimefilter();

  const [description, setDescription] = useState(definition.stream.description || '');

  const [isGenerating, setIsGenerating] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  const aiFeatures = useAIFeatures();

  const { signal } = useAbortController();

  // Save the updated description; show success and error toasts
  const save = useCallback(
    async (nextDescription: string) => {
      setIsUpdating(true);
      updateStream(
        Streams.all.UpsertRequest.parse({
          dashboards: definition.dashboards,
          queries: definition.queries,
          rules: definition.rules,
          stream: {
            ...omit(definition.stream, 'name'),
            description: nextDescription,
          },
        })
      )
        .then(() => {
          notifications.toasts.addSuccess({
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.saveSuccessTitle',
              {
                defaultMessage: 'Description saved',
              }
            ),
          });
        })
        .catch((error) => {
          notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.saveErrorTitle',
              {
                defaultMessage: 'Failed to save description',
              }
            ),
            toastMessage: getFormattedError(error).message,
          });
        })
        .finally(() => {
          setIsUpdating(false);
        });
    },
    [definition, updateStream, notifications.toasts]
  );

  const generate = useCallback(() => {
    if (!aiFeatures?.genAiConnectors.selectedConnector) {
      return;
    }

    setIsGenerating(true);

    streams.streamsRepositoryClient
      .stream('POST /internal/streams/{name}/_describe_stream', {
        signal,
        params: {
          path: {
            name: definition.stream.name,
          },
          query: {
            connectorId: aiFeatures.genAiConnectors.selectedConnector,
            from: timeState.asAbsoluteTimeRange.from,
            to: timeState.asAbsoluteTimeRange.to,
          },
        },
      })
      .subscribe({
        next({ description: generatedDescription }) {
          setDescription(generatedDescription);
        },
        complete() {
          setIsGenerating(false);
        },
        error(error) {
          setIsGenerating(false);
          notifications.toasts.addError(error, {
            title: i18n.translate(
              'xpack.streams.streamDetailView.streamDescription.generateErrorTitle',
              { defaultMessage: 'Failed to generate description' }
            ),
            toastMessage: getFormattedError(error).message,
          });
        },
      });
  }, [
    definition.stream.name,
    streams.streamsRepositoryClient,
    timeState.asAbsoluteTimeRange.from,
    timeState.asAbsoluteTimeRange.to,
    aiFeatures?.genAiConnectors.selectedConnector,
    signal,
    notifications.toasts,
  ]);

  useEffect(() => {
    const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connectorId || !isEmpty(description)) return;
  }, [aiFeatures?.genAiConnectors.selectedConnector, description]);

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
          <EuiMarkdownEditor
            value={description}
            onChange={(next) => {
              setDescription(next);
            }}
            aria-labelledby="stream-description-editor"
            placeholder={STREAM_DESCRIPTION_EMPTY}
            readOnly={isGenerating || isUpdating}
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
                      iconType="save"
                      size="s"
                      iconSize="s"
                      fill
                      isLoading={isUpdating}
                      isDisabled={isUpdating || isGenerating}
                      onClick={() => {
                        save(description);
                      }}
                    >
                      {SAVE_DESCRIPTION_BUTTON_LABEL}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              ),
            }}
          />
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
};
