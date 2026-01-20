/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { System, Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import type { FeatureSelectorProps } from './feature_selector';
import { FeaturesSelector } from './feature_selector';
import { AssetImage } from '../asset_image';
import { ConnectorListButtonBase } from '../connector_list_button/connector_list_button';
import type { Flow } from './add_significant_event_flyout/types';
import type { AIFeatures } from '../../hooks/use_ai_features';
import { FeatureIdentificationControl } from './feature_identification_control';

export function SignificantEventsGenerationPanel({
  features,
  selectedFeatures,
  onFeaturesChange,
  definition,
  refreshFeatures,
  onGenerateSuggestionsClick,
  onManualEntryClick,
  isGeneratingQueries,
  isSavingManualEntry,
  selectedFlow,
  aiFeatures,
}: FeatureSelectorProps & {
  definition: Streams.all.Definition;
  refreshFeatures: () => void;
  onManualEntryClick: () => void;
  onGenerateSuggestionsClick: (features: System[]) => void;
  isGeneratingQueries: boolean;
  isSavingManualEntry: boolean;
  selectedFlow?: Flow;
  aiFeatures: AIFeatures | null;
}) {
  const [generatingFrom, setGeneratingFrom] = useState<'all_data' | 'features'>(
    selectedFeatures.length === 0 ? 'all_data' : 'features'
  );

  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiFlexItem>
        <EuiPanel hasBorder css={{ textAlign: 'left' }}>
          {features.length === 0 ? (
            <IdentifyFeatures
              definition={definition}
              refreshFeatures={refreshFeatures}
              aiFeatures={aiFeatures}
              isGeneratingQueries={isGeneratingQueries}
              isSavingManualEntry={isSavingManualEntry}
            />
          ) : (
            <GenerationContext
              features={features}
              selectedFeatures={selectedFeatures}
              onFeaturesChange={onFeaturesChange}
              isGeneratingQueries={isGeneratingQueries}
              onGenerateSuggestionsClick={() => {
                setGeneratingFrom('features');
                onGenerateSuggestionsClick(selectedFeatures);
              }}
              generatingFrom={generatingFrom}
              isSavingManualEntry={isSavingManualEntry}
              aiFeatures={aiFeatures}
            />
          )}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup alignItems="center" gutterSize="m" css={{ width: '100%' }}>
          <EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              {i18n.translate(
                'xpack.streams.significantEvents.significantEventsGenerationPanel.orStartWithLabel',
                {
                  defaultMessage: 'or create significant events with',
                }
              )}
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiHorizontalRule margin="none" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem>
        <EuiFlexGroup
          alignItems="center"
          direction="row"
          justifyContent="spaceEvenly"
          gutterSize="s"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <ConnectorListButtonBase
              buttonProps={{
                iconType: 'sparkles',
                onClick: () => {
                  setGeneratingFrom('all_data');
                  onFeaturesChange([]);
                  onGenerateSuggestionsClick([]);
                },
                isDisabled: isGeneratingQueries || isSavingManualEntry,
                isLoading: isGeneratingQueries && generatingFrom === 'all_data',
                'data-test-subj': 'significant_events_all_data_button',
                children: i18n.translate(
                  'xpack.streams.significantEvents.significantEventsGenerationPanel.allDataButtonLabel',
                  {
                    defaultMessage: 'All data',
                  }
                ),
              }}
              aiFeatures={aiFeatures}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              fill={false}
              data-test-subj="significant_events_manual_entry_button"
              onClick={onManualEntryClick}
              isDisabled={isGeneratingQueries || selectedFlow === 'manual'}
              iconType="plusInCircle"
            >
              {i18n.translate(
                'xpack.streams.significantEvents.significantEventsGenerationPanel.manualEntryButtonLabel',
                {
                  defaultMessage: 'Manual entry',
                }
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function GenerationContext({
  features,
  selectedFeatures,
  onFeaturesChange,
  isGeneratingQueries,
  onGenerateSuggestionsClick,
  generatingFrom,
  isSavingManualEntry,
  aiFeatures,
}: FeatureSelectorProps & {
  isGeneratingQueries: boolean;
  onGenerateSuggestionsClick: () => void;
  generatingFrom: 'all_data' | 'features';
  isSavingManualEntry: boolean;
  aiFeatures: AIFeatures | null;
}) {
  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <b>
              {i18n.translate(
                'xpack.streams.significantEvents.significantEventsGenerationPanel.generationContextTitle',
                {
                  defaultMessage: 'Generation context',
                }
              )}
            </b>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.streams.significantEvents.significantEventsGenerationPanel.description',
              {
                defaultMessage:
                  'Select the subset of data you want to generate the significant events for. Generation uses the last 24 hours of data.',
              }
            )}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <AssetImage type="checklist" size={80} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexItem>
        <FeaturesSelector
          isDisabled={isGeneratingQueries || isSavingManualEntry}
          features={features}
          selectedFeatures={selectedFeatures}
          onFeaturesChange={onFeaturesChange}
        />
      </EuiFlexItem>

      <EuiSpacer size="s" />

      <EuiFlexItem>
        <ConnectorListButtonBase
          buttonProps={{
            iconType: 'sparkles',
            isLoading: isGeneratingQueries && generatingFrom === 'features',
            isDisabled: isGeneratingQueries || selectedFeatures.length === 0 || isSavingManualEntry,
            onClick: onGenerateSuggestionsClick,
            'data-test-subj': 'significant_events_generate_suggestions_button',
            children: i18n.translate(
              'xpack.streams.significantEvents.significantEventsGenerationPanel.generateSuggestionsButtonLabel',
              {
                defaultMessage: 'Generate suggestions',
              }
            ),
          }}
          aiFeatures={aiFeatures}
        />
      </EuiFlexItem>
    </>
  );
}

function IdentifyFeatures({
  definition,
  refreshFeatures,
  aiFeatures,
  isGeneratingQueries,
  isSavingManualEntry,
}: {
  definition: Streams.all.Definition;
  refreshFeatures: () => void;
  aiFeatures: AIFeatures | null;
  isGeneratingQueries: boolean;
  isSavingManualEntry: boolean;
}) {
  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <b>
              {i18n.translate(
                'xpack.streams.significantEvents.significantEventsGenerationPanel.identifyFeaturesTitle',
                {
                  defaultMessage: 'Identify features',
                }
              )}
            </b>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiText size="s" color="subdued">
            {i18n.translate(
              'xpack.streams.significantEvents.significantEventsGenerationPanel.identifyFeaturesDescription',
              {
                defaultMessage:
                  'Features are logical subsets of the data and they provide the best context for the generation of significant events. Identify features first. Generation uses the last 24 hours of data.',
              }
            )}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <AssetImage type="checklist" size={80} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexItem grow={false}>
        <FeatureIdentificationControl
          definition={definition}
          refreshFeatures={refreshFeatures}
          aiFeatures={aiFeatures}
          disabled={isGeneratingQueries || isSavingManualEntry}
        />
      </EuiFlexItem>
    </>
  );
}
