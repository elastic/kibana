/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AIConnector } from '@kbn/inference-connectors';
import {
  AI_INSIGHTS_GENERATION_MODE,
  AI_INSIGHTS_HEIGHT_MODE,
  AI_INSIGHTS_REFRESH_MODE,
} from '../../common/ai_insights/constants';
import type {
  AiInsightsGenerationMode,
  AiInsightsHeightMode,
  AiInsightsRefreshMode,
} from '../../common/ai_insights/types';

export interface AiInsightsSettings {
  connectorId: string;
  generationMode: AiInsightsGenerationMode;
  refreshMode: AiInsightsRefreshMode;
  heightMode: AiInsightsHeightMode;
}

export interface ConnectorSettingsFlyoutProps {
  connectors: AIConnector[];
  selectedConnectorId: string;
  generationMode: AiInsightsGenerationMode;
  refreshMode: AiInsightsRefreshMode;
  heightMode: AiInsightsHeightMode;
  onSave: (settings: AiInsightsSettings) => void;
  onClose: () => void;
  onManageConnectors: () => void;
  ariaLabelledBy: string;
}

export const ConnectorSettingsFlyout: React.FC<ConnectorSettingsFlyoutProps> = ({
  connectors,
  selectedConnectorId,
  generationMode: initialGenerationMode,
  refreshMode: initialRefreshMode,
  heightMode: initialHeightMode,
  onSave,
  onClose,
  onManageConnectors,
  ariaLabelledBy,
}) => {
  const [connectorId, setConnectorId] = useState(selectedConnectorId);
  const [generationMode, setGenerationMode] =
    useState<AiInsightsGenerationMode>(initialGenerationMode);
  const [refreshMode, setRefreshMode] = useState<AiInsightsRefreshMode>(initialRefreshMode);
  const [heightMode, setHeightMode] = useState<AiInsightsHeightMode>(initialHeightMode);

  const connectorOptions = useMemo(
    () =>
      connectors.map((connector) => ({
        value: connector.id,
        text: connector.name,
      })),
    [connectors]
  );

  const generationOptions = [
    {
      value: AI_INSIGHTS_GENERATION_MODE.on_demand,
      text: i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.generation.onDemand', {
        defaultMessage: 'Generate on demand',
      }),
    },
    {
      value: AI_INSIGHTS_GENERATION_MODE.automatic,
      text: i18n.translate(
        'xpack.agentBuilderDashboards.aiInsights.settings.generation.automatic',
        { defaultMessage: 'Generate automatically on load' }
      ),
    },
  ];

  const refreshOptions = [
    {
      value: AI_INSIGHTS_REFRESH_MODE.manual,
      text: i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.refresh.manual', {
        defaultMessage: 'Update manually',
      }),
    },
    {
      value: AI_INSIGHTS_REFRESH_MODE.auto,
      text: i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.refresh.auto', {
        defaultMessage: 'Update when time range or filters change',
      }),
    },
  ];

  const heightOptions = [
    {
      value: AI_INSIGHTS_HEIGHT_MODE.auto,
      text: i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.height.auto', {
        defaultMessage: 'Auto-fit to content',
      }),
    },
    {
      value: AI_INSIGHTS_HEIGHT_MODE.fixed,
      text: i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.height.fixed', {
        defaultMessage: 'Fixed height (scroll if needed)',
      }),
    },
  ];

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={ariaLabelledBy}>
            {i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.title', {
              defaultMessage: 'AI Insights settings',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.description', {
              defaultMessage:
                'Choose the model and how this panel generates, refreshes, and sizes insights.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.modelLabel', {
            defaultMessage: 'Model',
          })}
        >
          <EuiSelect
            options={connectorOptions}
            value={connectorId}
            onChange={(event) => setConnectorId(event.target.value)}
            aria-label={i18n.translate(
              'xpack.agentBuilderDashboards.aiInsights.settings.modelAria',
              { defaultMessage: 'Select GenAI model' }
            )}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        <EuiButtonEmpty flush="left" iconType="gear" onClick={onManageConnectors}>
          {i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.manage', {
            defaultMessage: 'Manage models',
          })}
        </EuiButtonEmpty>

        <EuiSpacer size="l" />
        <EuiFormRow
          label={i18n.translate(
            'xpack.agentBuilderDashboards.aiInsights.settings.generationLabel',
            { defaultMessage: 'Generation' }
          )}
          helpText={i18n.translate(
            'xpack.agentBuilderDashboards.aiInsights.settings.generationHelp',
            {
              defaultMessage:
                'Automatic generates insights when the panel loads. On demand waits for you to click Generate.',
            }
          )}
        >
          <EuiSelect
            options={generationOptions}
            value={generationMode}
            onChange={(event) => setGenerationMode(event.target.value as AiInsightsGenerationMode)}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.refreshLabel', {
            defaultMessage: 'After insights are loaded',
          })}
          helpText={i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.refreshHelp', {
            defaultMessage:
              'Choose whether insights stay in sync with dashboard time range and filters, or only refresh when you ask.',
          })}
        >
          <EuiSelect
            options={refreshOptions}
            value={refreshMode}
            onChange={(event) => setRefreshMode(event.target.value as AiInsightsRefreshMode)}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />
        <EuiFormRow
          label={i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.heightLabel', {
            defaultMessage: 'Panel height',
          })}
          helpText={i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.heightHelp', {
            defaultMessage:
              'Auto-fit grows and shrinks the panel with the insight. Fixed keeps your resized height and scrolls overflow.',
          })}
        >
          <EuiSelect
            options={heightOptions}
            value={heightMode}
            onChange={(event) => setHeightMode(event.target.value as AiInsightsHeightMode)}
            data-test-subj="aiInsightsHeightModeSelect"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.cancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={() =>
                onSave({
                  connectorId,
                  generationMode,
                  refreshMode,
                  heightMode,
                })
              }
              disabled={!connectorId}
            >
              {i18n.translate('xpack.agentBuilderDashboards.aiInsights.settings.save', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
