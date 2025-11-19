/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import { lastValueFrom } from 'rxjs';
import { DashboardRenderer } from '@kbn/dashboard-plugin/public';
import type { DashboardLocatorParams } from '@kbn/dashboard-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';
import { AssetImage } from '../../asset_image';
import { useAIFeatures } from '../../../hooks/use_ai_features';

const DASHBOARD_LOCATOR_ID = 'DASHBOARD_APP_LOCATOR';

export function StreamDetailDashboardGeneration({
  definition,
}: {
  definition: Streams.all.GetResponse;
}) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
        share,
      },
    },
  } = useKibana();

  const aiFeatures = useAIFeatures();

  const [suggestedDashboard, setSuggestedDashboard] = React.useState<any | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [initialGuidance, setInitialGuidance] = React.useState('');
  const [isRefineModalVisible, setIsRefineModalVisible] = React.useState(false);
  const [refinementNotes, setRefinementNotes] = React.useState('');
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

  const splitButtonPopoverId = useGeneratedHtmlId({ prefix: 'splitButtonPopover' });
  const refineModalTitleId = useGeneratedHtmlId();

  const dashboardLocator = share.url.locators.get<DashboardLocatorParams>(DASHBOARD_LOCATOR_ID);
  const c = useAbortController();

  async function onGenerateDashboardClick(guidance?: string, previousDashboard?: any) {
    setIsGenerating(true);
    try {
      const observable = streamsRepositoryClient.stream(
        'POST /internal/streams/{name}/_suggest_dashboard',
        {
          params: {
            path: {
              name: definition.stream.name,
            },
            body: {
              connector_id: aiFeatures?.genAiConnectors?.selectedConnector || '',
              guidance,
              previous_dashboard: previousDashboard,
            },
          },
          signal: c.signal,
        }
      );

      const dashboard = await lastValueFrom(observable);
      setSuggestedDashboard(dashboard);
      setIsGenerating(false);
    } catch (error) {
      setIsGenerating(false);
    }
  }

  const handleRegenerateFromScratch = () => {
    setIsPopoverOpen(false);
    onGenerateDashboardClick(initialGuidance || undefined, undefined);
  };

  const handleRefineClick = () => {
    setIsPopoverOpen(false);
    setIsRefineModalVisible(true);
  };

  const handleRefineSubmit = () => {
    const combinedGuidance = [initialGuidance, refinementNotes].filter(Boolean).join('\n\n');
    setIsRefineModalVisible(false);
    setRefinementNotes('');
    onGenerateDashboardClick(
      combinedGuidance || undefined,
      suggestedDashboard?.rawDashboard || undefined
    );
  };

  if (isGenerating) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiSpacer size="m" />
        <EuiLoadingSpinner size="m" />
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailDashboardGeneration.generatingTitle', {
              defaultMessage: 'Generating dashboard',
            })}
          </h2>
        </EuiTitle>
        <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
          {i18n.translate('xpack.streams.streamDetailDashboardGeneration.generatingDescription', {
            defaultMessage:
              'This may take a few moments depending on the size of your data. Please wait...',
          })}
        </EuiText>
      </EuiFlexGroup>
    );
  }
  if (!suggestedDashboard) {
    return (
      <EuiFlexGroup direction="column" alignItems="center" justifyContent="center">
        <EuiSpacer size="m" />
        <AssetImage type="barChart" size="m" />
        <EuiTitle size="s">
          <h2>
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.h2.generateDashboardLabel',
              { defaultMessage: 'Generate dashboard' }
            )}
          </h2>
        </EuiTitle>
        <EuiText size="s" textAlign="center" css={{ maxWidth: 480 }}>
          {i18n.translate(
            'xpack.streams.streamDetailDashboardGeneration.generateADashboardBasedTextLabel',
            { defaultMessage: "Generate a dashboard based on the stream's data." }
          )}
        </EuiText>
        <EuiFormRow
          label={i18n.translate('xpack.streams.streamDetailDashboardGeneration.guidanceLabel', {
            defaultMessage: 'Guidance (optional)',
          })}
          fullWidth
          css={{ maxWidth: 480 }}
        >
          <EuiTextArea
            placeholder={i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.guidancePlaceholder',
              {
                defaultMessage: 'e.g., Include charts for error rates and response times...',
              }
            )}
            value={initialGuidance}
            onChange={(e) => setInitialGuidance(e.target.value)}
            rows={3}
            fullWidth
          />
        </EuiFormRow>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiButton
            iconType="sparkles"
            fill
            onClick={() => onGenerateDashboardClick(initialGuidance || undefined, undefined)}
          >
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.generateDashboardButtonLabel',
              { defaultMessage: 'Generate dashboard' }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlexGroup>
    );
  }

  const menuItems = [
    <EuiContextMenuItem key="regenerate" icon="refresh" onClick={handleRegenerateFromScratch}>
      {i18n.translate('xpack.streams.streamDetailDashboardGeneration.regenerateFromScratchLabel', {
        defaultMessage: 'Regenerate from scratch',
      })}
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="refine" icon="pencil" onClick={handleRefineClick}>
      {i18n.translate('xpack.streams.streamDetailDashboardGeneration.refineLabel', {
        defaultMessage: 'Refine',
      })}
    </EuiContextMenuItem>,
  ];

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="sparkles" fill onClick={handleRegenerateFromScratch}>
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.generateAnotherButtonLabel',
              { defaultMessage: 'Generate another' }
            )}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            id={splitButtonPopoverId}
            button={
              <EuiButtonIcon
                display="fill"
                size="s"
                iconType="boxesVertical"
                aria-label={i18n.translate(
                  'xpack.streams.streamDetailDashboardGeneration.euiButtonIcon.moreOptionsLabel',
                  { defaultMessage: 'More options' }
                )}
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenuPanel size="s" items={menuItems} />
          </EuiPopover>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={async () => {
              dashboardLocator?.navigate({
                viewMode: 'view',
                panels: suggestedDashboard.kibanaDashboard?.data?.panels || {},
                timeRange: { from: 'now-24h', to: 'now' },
              });
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailDashboardGeneration.openAsDashboardButtonLabel',
              { defaultMessage: 'Open as dashboard' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <DashboardRenderer
        getCreationOptions={async () =>
          Promise.resolve({
            getInitialInput: () => ({
              viewMode: 'view',
              panels: suggestedDashboard.kibanaDashboard?.data?.panels || {},
              timeRange: { from: 'now-24h', to: 'now' },
            }),
          })
        }
      />
      {isRefineModalVisible && (
        <EuiModal
          aria-labelledby={refineModalTitleId}
          onClose={() => setIsRefineModalVisible(false)}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle id={refineModalTitleId}>
              {i18n.translate('xpack.streams.streamDetailDashboardGeneration.refineModalTitle', {
                defaultMessage: 'Refine dashboard',
              })}
            </EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiText size="s">
              {i18n.translate(
                'xpack.streams.streamDetailDashboardGeneration.refineModalDescription',
                {
                  defaultMessage:
                    'Describe how you would like to refine the dashboard. For example, change a chart to a pie chart, add a new visualization, etc.',
                }
              )}
            </EuiText>
            <EuiSpacer size="m" />
            <EuiFormRow
              label={i18n.translate(
                'xpack.streams.streamDetailDashboardGeneration.refinementNotesLabel',
                { defaultMessage: 'Refinement notes' }
              )}
              fullWidth
            >
              <EuiTextArea
                placeholder={i18n.translate(
                  'xpack.streams.streamDetailDashboardGeneration.refinementNotesPlaceholder',
                  {
                    defaultMessage: 'e.g., Change the bar chart to a pie chart...',
                  }
                )}
                value={refinementNotes}
                onChange={(e) => setRefinementNotes(e.target.value)}
                rows={5}
                fullWidth
              />
            </EuiFormRow>
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={() => setIsRefineModalVisible(false)}>
              {i18n.translate('xpack.streams.streamDetailDashboardGeneration.cancelButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButton>
            <EuiButton onClick={handleRefineSubmit} fill iconType="sparkles">
              {i18n.translate(
                'xpack.streams.streamDetailDashboardGeneration.refineSubmitButtonLabel',
                { defaultMessage: 'Refine dashboard' }
              )}
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </EuiFlexGroup>
  );
}
