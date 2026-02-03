/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import type { Streams } from '@kbn/streams-schema';
import { type SystemSelectorProps } from '../system_selector';
import { SignificantEventsGenerationPanel } from '../generation_panel';
import type { AIFeatures } from '../../../hooks/use_ai_features';

export function EmptyState({
  definition,
  refreshSystems,
  onManualEntryClick,
  onGenerateSuggestionsClick,
  systems,
  selectedSystems,
  onSystemsChange,
  aiFeatures,
}: SystemSelectorProps & {
  definition: Streams.all.Definition;
  refreshSystems: () => void;
  onManualEntryClick: () => void;
  onGenerateSuggestionsClick: () => void;
  aiFeatures: AIFeatures | null;
}) {
  return (
    <EuiEmptyPrompt
      titleSize="xs"
      title={
        <h2>
          {i18n.translate('xpack.streams.significantEvents.emptyState.title', {
            defaultMessage: 'Significant events',
          })}
        </h2>
      }
      body={
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem>
            <EuiText size="s" textAlign="center" color="subdued">
              {i18n.translate('xpack.streams.significantEvents.emptyState.description', {
                defaultMessage:
                  "Single, ‘interesting’ log event identified by an automated rule as being important for understanding a system's behaviour.",
              })}
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem>
            <SignificantEventsGenerationPanel
              systems={systems}
              selectedSystems={selectedSystems}
              onSystemsChange={onSystemsChange}
              onGenerateSuggestionsClick={onGenerateSuggestionsClick}
              definition={definition}
              refreshSystems={refreshSystems}
              onManualEntryClick={onManualEntryClick}
              isGeneratingQueries={false}
              isSavingManualEntry={false}
              aiFeatures={aiFeatures}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
