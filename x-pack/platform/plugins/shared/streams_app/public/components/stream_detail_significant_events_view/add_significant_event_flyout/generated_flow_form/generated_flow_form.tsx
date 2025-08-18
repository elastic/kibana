/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiContextMenu,
  EuiFlexGroup,
  EuiPopover,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import { isEmpty } from 'lodash';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../../hooks/use_significant_events_api';
import { validateQuery } from '../common/validate_query';
import { AIFeaturesDisabledCallout } from './ai_features_disabled_callout';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';
import { useAIFeatures } from './use_ai_features';

interface Props {
  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
}

export function GeneratedFlowForm({ setQueries, definition, setCanSave, isSubmitting }: Props) {
  const {
    core: { notifications },
  } = useKibana();
  const aiFeatures = useAIFeatures();
  const { generate } = useSignificantEventsApi({ name: definition.name });

  const contextMenuPopoverId = useGeneratedHtmlId();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const closePopover = () => setIsPopoverOpen(false);
  const onButtonClick = () => setIsPopoverOpen((prev) => !prev);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<StreamQueryKql[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<StreamQueryKql[]>([]);

  const onGenerateClick = (method: 'zero_shot' | 'log_patterns') => {
    setIsGenerating(true);
    setGeneratedQueries([]);
    setSelectedQueries([]);
    setIsPopoverOpen(false);

    const generation$ = generate(aiFeatures?.genAiConnectors.selectedConnector!, method);

    generation$.subscribe({
      next: (result) => {
        const validation = validateQuery({
          title: result.query.title,
          kql: { query: result.query.kql },
        });

        if (!validation.kql.isInvalid) {
          setGeneratedQueries((prev) => [
            ...prev,
            { id: v4(), kql: { query: result.query.kql }, title: result.query.title },
          ]);
        }
      },
      error: (error) => {
        setIsGenerating(false);
        if (error.name === 'AbortError') {
          return;
        }
        notifications.showErrorDialog({
          title: i18n.translate(
            'xpack.streams.addSignificantEventFlyout.aiFlow.generateErrorToastTitle',
            { defaultMessage: `Could not generate significant events queries` }
          ),
          error,
        });
      },
      complete: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate(
            'xpack.streams.addSignificantEventFlyout.aiFlow.generateSuccessToastTitle',
            { defaultMessage: `Generated significant events queries successfully` }
          ),
        });
        setIsGenerating(false);
      },
    });
  };

  const panels = [
    {
      id: 0,
      title: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.chooseMethod', {
        defaultMessage: 'Choose a method',
      }),
      items: [
        {
          name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.descriptionBased', {
            defaultMessage: 'Description based',
          }),
          icon: 'sparkles',
          onClick: () => onGenerateClick('zero_shot'),
          disabled: isEmpty(definition.description),
        },
        {
          name: i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.logPatternsBased', {
            defaultMessage: 'Log patterns based',
          }),
          icon: 'securitySignalDetected',
          onClick: () => onGenerateClick('log_patterns'),
        },
      ],
    },
  ];

  const onSelectionChange = (selectedItems: StreamQueryKql[]) => {
    setSelectedQueries(selectedItems);
    setQueries(selectedItems);
  };

  useEffect(() => {
    setCanSave(selectedQueries.length > 0);
  }, [selectedQueries, setCanSave]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.generatedFlowFormTitle', {
            defaultMessage: 'Suggested significant events',
          })}
        </h3>
      </EuiTitle>

      {aiFeatures && !aiFeatures.enabled && !aiFeatures.genAiConnectors.loading && (
        <AIFeaturesDisabledCallout couldBeEnabled={aiFeatures?.couldBeEnabled ?? false} />
      )}
      {aiFeatures && aiFeatures.enabled && (
        <EuiFlexGroup direction="column" gutterSize="m" alignItems="flexStart">
          <EuiPopover
            id={contextMenuPopoverId}
            button={
              <EuiButton
                disabled={isGenerating || isSubmitting}
                isLoading={isGenerating}
                iconType="arrowDown"
                iconSide="left"
                onClick={onButtonClick}
              >
                {isGenerating
                  ? i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.aiFlow.generatingButtonLabel',
                      { defaultMessage: 'Generating...' }
                    )
                  : i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.aiFlow.generateButtonLabel',

                      { defaultMessage: 'Generate' }
                    )}
              </EuiButton>
            }
            isOpen={isPopoverOpen}
            closePopover={closePopover}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>

          <SignificantEventsGeneratedTable
            isSubmitting={isSubmitting}
            generatedQueries={generatedQueries}
            selectedQueries={selectedQueries}
            onSelectionChange={onSelectionChange}
            definition={definition}
          />
        </EuiFlexGroup>
      )}
    </EuiFlexGroup>
  );
}
