/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiMarkdownFormat,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { isEmpty } from 'lodash';
import type { Streams } from '@kbn/streams-schema';
import { useUpdateStreams } from '../../../hooks/use_update_streams';
import { useAIFeatures } from '../../stream_detail_significant_events_view/add_significant_event_flyout/generated_flow_form/use_ai_features';
import { useDescriptionGenerateApi } from '../../../hooks/use_description_generate_api';

export interface AISummaryProps {
  definition: Streams.ClassicStream.GetResponse;
}

const accordionProps = { css: { alignSelf: 'flex-start' } };
const textProps = { css: { marginTop: 2, marginBottom: 1 } };

export const StreamDescription: React.FC<AISummaryProps> = ({ definition }) => {
  const { name, ...restStream } = definition.stream;
  const generateApi = useDescriptionGenerateApi({ name });
  const updateStream = useUpdateStreams(name);
  const [description, setDescription] = useState(definition.stream.description || '');

  const [isGenerating, setIsGenerating] = useState(false);
  const aiFeatures = useAIFeatures();

  useEffect(() => {
    const connectorId = aiFeatures?.genAiConnectors.selectedConnector;
    if (!connectorId || !isEmpty(description)) return;
    const generation$ = generateApi(connectorId);
    setIsGenerating(true);
    generation$.subscribe({
      next: (result) => {
        setDescription(result.description);
      },
      error: (error) => {
        setIsGenerating(false);
        if (error.name === 'AbortError') {
          return;
        }
      },
      complete: () => {
        setIsGenerating(false);
      },
    });
  }, [aiFeatures?.genAiConnectors.selectedConnector, description, generateApi, updateStream]);

  useEffect(() => {
    if (description && !definition.stream.description) {
      updateStream({
        rules: definition.rules,
        dashboards: definition.dashboards,
        queries: definition.queries,
        stream: {
          ...restStream,
          description,
        },
      }).catch(() => {});
    }
  }, [definition, definition.stream, description, name, restStream, updateStream]);

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiAccordion
        id="aiSummaryContainer"
        arrowProps={accordionProps}
        initialIsOpen={true}
        buttonContent={
          <EuiFlexGroup wrap responsive={false} gutterSize="m" data-test-subj="aiSummaryButton">
            <EuiFlexItem grow={false}>
              <EuiSpacer size="xs" />
              <AssistantIcon size="m" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="center">
                <EuiText {...textProps}>
                  <h5>Stream description</h5>
                </EuiText>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        isLoading={isGenerating}
        isDisabled={isGenerating}
      >
        {description && (
          <>
            <EuiSpacer size="m" />
            <EuiPanel
              hasBorder={false}
              hasShadow={false}
              color="subdued"
              data-test-subj="aiSummaryResponse"
            >
              <EuiMarkdownFormat textSize="s">{description}</EuiMarkdownFormat>
            </EuiPanel>
          </>
        )}
      </EuiAccordion>
    </EuiPanel>
  );
};
