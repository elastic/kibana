/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
=======
  EuiBadge,
  EuiContextMenu,
>>>>>>> 9f0c98ac44f (first commit)
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSelectable,
  EuiSplitButton,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import type { InferenceConnector } from '@kbn/inference-common';
import type { OnboardingStep } from '@kbn/streams-schema';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import React, { useCallback, useMemo, useState } from 'react';
import type { UseInferenceFeatureConnectorsResult } from '../../../../../hooks/sig_events/use_inference_feature_connectors';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import { useKibana } from '../../../../../hooks/use_kibana';
import {
  DEFAULT_MODEL_BADGE_LABEL,
  GENERATE_BUTTON_LABEL,
  GENERATE_FEATURES_BUTTON_LABEL,
  GENERATE_FEATURES_TOOLTIP,
  GENERATE_QUERIES_BUTTON_LABEL,
  GENERATE_QUERIES_TOOLTIP,
  MODEL_SELECTION_PANEL_TITLE,
  MODEL_SETTINGS_LABEL,
  ONBOARDING_CONFIG_POPOVER_ARIA_LABEL,
} from './translations';

export interface OnboardingConfig {
  steps: OnboardingStep[];
  connectors: {
    features?: string;
    queries?: string;
  };
}

interface StepRowProps {
  step: OnboardingStep;
  label: string;
  enabled: boolean;
  displayConnectorId: string | undefined;
  connectors: UseInferenceFeatureConnectorsResult;
  onToggle: (step: OnboardingStep, enabled: boolean) => void;
  onConnectorChange: (step: OnboardingStep, connectorId: string) => void;
}

const StepRow = ({
  step,
  label,
  enabled,
  displayConnectorId,
  connectors,
  onToggle,
  onConnectorChange,
}: StepRowProps) => {
  const selectId = useGeneratedHtmlId({ prefix: `onboardingStep_${step}` });

  const connectorOptions = buildConnectorSelectOptions(connectors.allConnectors);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem>
        <EuiSwitch
          label={label}
          checked={enabled}
          onChange={(e) => onToggle(step, e.target.checked)}
          compressed
        />
      </EuiFlexItem>
      {displayConnectorId && connectorOptions.length > 0 && (
        <EuiFlexItem>
          <EuiFormRow display="rowCompressed" aria-label={label}>
            <EuiSuperSelect
              id={selectId}
              options={connectorOptions}
              valueOfSelected={displayConnectorId}
              onChange={(value) => onConnectorChange(step, value)}
              disabled={!enabled}
              compressed
              fullWidth
            />
          </EuiFormRow>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

=======
>>>>>>> 9f0c98ac44f (first commit)
interface OnboardingConfigPopoverProps {
  config: OnboardingConfig;
  featuresConnectors: UseInferenceFeatureConnectorsResult;
  queriesConnectors: UseInferenceFeatureConnectorsResult;
  onConfigChange: (config: OnboardingConfig) => void;
  onRun: () => void;
  onRunFeaturesOnly: () => void;
  onRunQueriesOnly: () => void;
  isRunDisabled: boolean;
}

interface ConnectorSubPanelProps {
  connectors: InferenceConnector[];
  resolvedConnector: InferenceConnector | undefined;
  selectedConnectorId: string | undefined;
  onSelect: (connectorId: string) => void;
}

export const ConnectorSubPanel = ({
  connectors,
  resolvedConnector,
  selectedConnectorId,
  onSelect,
}: ConnectorSubPanelProps) => {
  const options = useMemo<EuiSelectableOption[]>(
    () =>
      connectors.map((connector) => ({
        label: connector.name,
        key: connector.connectorId,
        checked: connector.connectorId === selectedConnectorId ? ('on' as const) : undefined,
        prepend: <ConnectorIcon connectorName={connector.name} />,
        append:
          connector.connectorId === resolvedConnector?.connectorId ? (
            <EuiBadge color="hollow">{DEFAULT_MODEL_BADGE_LABEL}</EuiBadge>
          ) : undefined,
      })),
    [connectors, selectedConnectorId, resolvedConnector]
  );

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.find((o) => o.checked === 'on');
      if (selected?.key) onSelect(selected.key);
    },
    [onSelect]
  );

  return (
    <EuiSelectable singleSelection options={options} onChange={handleChange}>
      {(list) => list}
    </EuiSelectable>
  );
};

export const OnboardingConfigPopover = ({
  config,
  featuresConnectors,
  queriesConnectors,
  onConfigChange,
  onRun,
  onRunFeaturesOnly,
  onRunQueriesOnly,
  isRunDisabled,
}: OnboardingConfigPopoverProps) => {
  const {
    dependencies: {
      start: { share },
    },
  } = useKibana();
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const [menuResetKey, setMenuResetKey] = useState(0);
  const popoverId = useGeneratedHtmlId({ prefix: 'onboardingConfigPopover' });

  const resetMenu = useCallback(() => setMenuResetKey((k) => k + 1), []);

  const handleClose = useCallback(() => {
    close();
    resetMenu();
  }, [close, resetMenu]);

  const featuresConnector = featuresConnectors.allConnectors.find(
    (c) => c.connectorId === config.connectors.features
  );
  const queriesConnector = queriesConnectors.allConnectors.find(
    (c) => c.connectorId === config.connectors.queries
  );

  const handleRunFeatures = useCallback(() => {
    close();
    onRunFeaturesOnly();
  }, [close, onRunFeaturesOnly]);

  const handleRunQueries = useCallback(() => {
    close();
    onRunQueriesOnly();
  }, [close, onRunQueriesOnly]);

  const handleFeaturesConnectorSelect = useCallback(
    (connectorId: string) => {
      onConfigChange({ ...config, connectors: { ...config.connectors, features: connectorId } });
      resetMenu();
    },
    [config, onConfigChange, resetMenu]
  );

  const handleQueriesConnectorSelect = useCallback(
    (connectorId: string) => {
      onConfigChange({ ...config, connectors: { ...config.connectors, queries: connectorId } });
      resetMenu();
    },
    [config, onConfigChange, resetMenu]
  );

  const managementUrl = useMemo(() => {
    const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
    return (
      managementLocator?.getRedirectUrl({
        sectionId: 'modelManagement',
        appId: 'model_settings',
      }) ?? ''
    );
  }, [share.url.locators]);

  const contextMenuPanels = useMemo(
    () => [
      {
        id: 0,
        items: [
          {
            name: GENERATE_FEATURES_BUTTON_LABEL,
            onClick: handleRunFeatures,
            disabled: isRunDisabled,
            toolTipContent: GENERATE_FEATURES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          {
            name: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ConnectorIcon connectorName={featuresConnector?.name} />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 0 }}>
                  <div className="eui-textTruncate">
                    Model <strong>{featuresConnector?.name ?? '—'}</strong>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            panel: 1,
          },
          { isSeparator: true as const },
          {
            name: GENERATE_QUERIES_BUTTON_LABEL,
            onClick: handleRunQueries,
            disabled: isRunDisabled,
            toolTipContent: GENERATE_QUERIES_TOOLTIP,
            toolTipProps: { position: 'right' as const },
          },
          {
            name: (
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <ConnectorIcon connectorName={queriesConnector?.name} />
                </EuiFlexItem>
                <EuiFlexItem css={{ minWidth: 0 }}>
                  <div className="eui-textTruncate">
                    Model <strong>{queriesConnector?.name ?? '—'}</strong>
                  </div>
                </EuiFlexItem>
              </EuiFlexGroup>
            ),
            panel: 2,
          },
          ...(managementUrl
            ? [
                { isSeparator: true as const },
                {
                  name: (
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem>{MODEL_SETTINGS_LABEL}</EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="popout" size="s" color="subdued" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  icon: 'gear' as const,
                  onClick: () => {
                    window.open(managementUrl, '_blank', 'noreferrer');
                    handleClose();
                  },
                },
              ]
            : []),
        ],
      },
      {
        id: 1,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={featuresConnectors.allConnectors}
            resolvedConnector={featuresConnectors.resolvedConnector}
            selectedConnectorId={config.connectors.features}
            onSelect={handleFeaturesConnectorSelect}
          />
        ),
      },
      {
        id: 2,
        title: MODEL_SELECTION_PANEL_TITLE,
        width: 240,
        content: (
          <ConnectorSubPanel
            connectors={queriesConnectors.allConnectors}
            resolvedConnector={queriesConnectors.resolvedConnector}
            selectedConnectorId={config.connectors.queries}
            onSelect={handleQueriesConnectorSelect}
          />
        ),
      },
    ],
    [
      handleRunFeatures,
      handleRunQueries,
      isRunDisabled,
      featuresConnector,
      queriesConnector,
      managementUrl,
      handleClose,
      featuresConnectors,
      queriesConnectors,
      config.connectors.features,
      config.connectors.queries,
      handleFeaturesConnectorSelect,
      handleQueriesConnectorSelect,
    ]
  );

  return (
    <EuiSplitButton size="m" data-test-subj="significant_events_generate_split_button">
      <EuiSplitButton.ActionPrimary
        onClick={onRun}
        isDisabled={isRunDisabled}
        iconType="radar"
        data-test-subj="significant_events_onboard_streams_button"
      >
        {GENERATE_BUTTON_LABEL}
      </EuiSplitButton.ActionPrimary>
      <EuiSplitButton.ActionSecondary
        iconType="arrowDown"
        aria-label={ONBOARDING_CONFIG_POPOVER_ARIA_LABEL}
        data-test-subj="significant_events_onboarding_config_trigger"
        isDisabled={isRunDisabled}
        onClick={toggle}
        popoverProps={{
          id: popoverId,
          isOpen,
          closePopover: handleClose,
          anchorPosition: 'downRight',
          panelPaddingSize: 'none',
          children: (
            <EuiContextMenu key={menuResetKey} initialPanelId={0} panels={contextMenuPanels} />
          ),
        }}
      />
    </EuiSplitButton>
  );
};
