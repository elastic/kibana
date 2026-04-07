/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
>>>>>>> d41dadb078c (feat(onboarding): add onboarding options)
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSuperSelect,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { OnboardingStep } from '@kbn/streams-schema';
import React, { useCallback } from 'react';
import type { UseInferenceFeatureConnectorsResult } from '../../../../../hooks/sig_events/use_inference_feature_connectors';
import { ConnectorIcon } from '../../../../connector_list_button/connector_icon';
import {
  FEATURES_STEP_LABEL,
  ONBOARDING_CONFIG_POPOVER_ARIA_LABEL,
  ONBOARDING_CONFIG_POPOVER_TITLE,
  QUERIES_STEP_LABEL,
  RUN_BUTTON_LABEL,
} from './translations';

export interface OnboardingConfig {
  steps: OnboardingStep[];
  connectors: {
    features?: string;
    queries?: string;
  };
}

>>>>>>> d41dadb078c (feat(onboarding): add onboarding options)
interface StepRowProps {
  step: OnboardingStep;
  label: string;
  enabled: boolean;
  connectorId: string | undefined;
  connectors: UseInferenceFeatureConnectorsResult;
  onToggle: (step: OnboardingStep, enabled: boolean) => void;
  onConnectorChange: (step: OnboardingStep, connectorId: string) => void;
}

const StepRow = ({
  step,
  label,
  enabled,
  connectorId,
  connectors,
  onToggle,
  onConnectorChange,
}: StepRowProps) => {
  const selectId = useGeneratedHtmlId({ prefix: `onboardingStep_${step}` });

  const connectorOptions = connectors.allConnectors.map((connector) => ({
    value: connector.connectorId,
    inputDisplay: (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <ConnectorIcon connectorName={connector.name} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{connector.name}</EuiFlexItem>
      </EuiFlexGroup>
    ),
  }));

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
      {connectorOptions.length >= 1 && (
        <EuiFlexItem>
          <EuiFormRow display="rowCompressed" aria-label={label}>
            <EuiSuperSelect
              id={selectId}
              options={connectorOptions}
              valueOfSelected={connectorId ?? ''}
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

const STEP_ORDER = [OnboardingStep.FeaturesIdentification, OnboardingStep.QueriesGeneration];

interface OnboardingConfigPopoverProps {
  config: OnboardingConfig;
  featuresConnectors: UseInferenceFeatureConnectorsResult;
  queriesConnectors: UseInferenceFeatureConnectorsResult;
  onConfigChange: (config: OnboardingConfig) => void;
  onRun: () => void;
  isRunDisabled: boolean;
}

export const OnboardingConfigPopover = ({
  config,
  featuresConnectors,
  queriesConnectors,
  onConfigChange,
  onRun,
  isRunDisabled,
}: OnboardingConfigPopoverProps) => {
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'onboardingConfigPopover' });

  const handleToggle = useCallback(
    (step: OnboardingStep, enabled: boolean) => {
      const toggled = enabled ? [...config.steps, step] : config.steps.filter((s) => s !== step);
      onConfigChange({ ...config, steps: STEP_ORDER.filter((s) => toggled.includes(s)) });
    },
    [config, onConfigChange]
  );

  const handleConnectorChange = useCallback(
    (step: OnboardingStep, newConnectorId: string) => {
      const key = step === OnboardingStep.FeaturesIdentification ? 'features' : 'queries';
      onConfigChange({ ...config, connectors: { ...config.connectors, [key]: newConnectorId } });
    },
    [config, onConfigChange]
  );

  const handleRun = useCallback(() => {
    close();
    onRun();
  }, [close, onRun]);

  return (
    <EuiPopover
      id={popoverId}
      aria-label={ONBOARDING_CONFIG_POPOVER_ARIA_LABEL}
      isOpen={isOpen}
      closePopover={close}
      button={
        <EuiButtonIcon
          data-test-subj="significant_events_onboarding_config_trigger"
          onClick={toggle}
          display="base"
          size="xs"
          iconType="arrowDown"
          aria-label={ONBOARDING_CONFIG_POPOVER_ARIA_LABEL}
        />
      }
      panelPaddingSize="m"
    >
      <EuiPopoverTitle paddingSize="s">{ONBOARDING_CONFIG_POPOVER_TITLE}</EuiPopoverTitle>
      <EuiFlexGroup direction="column" gutterSize="m" css={{ minWidth: 280 }}>
        <EuiFlexItem>
          <StepRow
            step={OnboardingStep.FeaturesIdentification}
            label={FEATURES_STEP_LABEL}
            enabled={config.steps.includes(OnboardingStep.FeaturesIdentification)}
            connectorId={config.connectors.features}
            connectors={featuresConnectors}
            onToggle={handleToggle}
            onConnectorChange={handleConnectorChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <StepRow
            step={OnboardingStep.QueriesGeneration}
            label={QUERIES_STEP_LABEL}
            enabled={config.steps.includes(OnboardingStep.QueriesGeneration)}
            connectorId={config.connectors.queries}
            connectors={queriesConnectors}
            onToggle={handleToggle}
            onConnectorChange={handleConnectorChange}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButton
            size="s"
            fill
            onClick={handleRun}
            disabled={isRunDisabled || config.steps.length === 0}
            data-test-subj="significant_events_onboarding_config_run_button"
          >
            {RUN_BUTTON_LABEL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPopover>
  );
};
