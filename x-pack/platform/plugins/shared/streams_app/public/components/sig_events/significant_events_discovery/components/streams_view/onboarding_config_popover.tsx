/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiSuperSelect,
  EuiSwitch,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InferenceConnector } from '@kbn/inference-common';
import { useBoolean } from '@kbn/react-hooks';
import { OnboardingStep } from '@kbn/streams-schema';
import React, { useCallback, useMemo } from 'react';
import { buildConnectorSelectOptions, getEffectiveConnectorId } from './connector_select_options';
import {
  CONNECTOR_LOAD_ERROR,
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

const STEP_CONNECTOR_KEY: Record<OnboardingStep, keyof OnboardingConfig['connectors']> = {
  [OnboardingStep.FeaturesIdentification]: 'features',
  [OnboardingStep.QueriesGeneration]: 'queries',
};

const STEPS: ReadonlyArray<{ step: OnboardingStep; label: string }> = [
  { step: OnboardingStep.FeaturesIdentification, label: FEATURES_STEP_LABEL },
  { step: OnboardingStep.QueriesGeneration, label: QUERIES_STEP_LABEL },
];

interface StepRowProps {
  step: OnboardingStep;
  label: string;
  enabled: boolean;
  displayConnectorId: string | undefined;
  connectorList: InferenceConnector[];
  connectorError: Error | undefined;
  onToggle: (step: OnboardingStep, enabled: boolean) => void;
  onConnectorChange: (step: OnboardingStep, connectorId: string) => void;
}

const StepRow = ({
  step,
  label,
  enabled,
  displayConnectorId,
  connectorList,
  connectorError,
  onToggle,
  onConnectorChange,
}: StepRowProps) => {
  const selectId = useGeneratedHtmlId({ prefix: `onboardingStep_${step}` });

  const connectorOptions = useMemo(
    () => buildConnectorSelectOptions(connectorList),
    [connectorList]
  );
  const effectiveConnectorId = useMemo(
    () => getEffectiveConnectorId(displayConnectorId, connectorOptions),
    [displayConnectorId, connectorOptions]
  );

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
      {connectorError ? (
        <EuiFlexItem>
          <EuiCallOut announceOnMount color="danger" size="s" title={CONNECTOR_LOAD_ERROR} />
        </EuiFlexItem>
      ) : (
        effectiveConnectorId &&
        connectorOptions.length > 0 && (
          <EuiFlexItem>
            <EuiFormRow display="rowCompressed" aria-label={label}>
              <EuiSuperSelect
                id={selectId}
                options={connectorOptions}
                valueOfSelected={effectiveConnectorId}
                onChange={(value) => onConnectorChange(step, value)}
                disabled={!enabled}
                compressed
                fullWidth
              />
            </EuiFormRow>
          </EuiFlexItem>
        )
      )}
    </EuiFlexGroup>
  );
};

interface OnboardingConfigPopoverProps {
  config: OnboardingConfig;
  displayConnectors: OnboardingConfig['connectors'];
  connectorList: InferenceConnector[];
  connectorError: Error | undefined;
  onConfigChange: (config: OnboardingConfig) => void;
  onRun: () => void;
  isRunDisabled: boolean;
}

const popoverContentStyle = css`
  min-width: 280px;
`;

export const OnboardingConfigPopover = ({
  config,
  displayConnectors,
  connectorList,
  connectorError,
  onConfigChange,
  onRun,
  isRunDisabled,
}: OnboardingConfigPopoverProps) => {
  const [isOpen, { off: close, toggle }] = useBoolean(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'onboardingConfigPopover' });

  const handleToggle = useCallback(
    (step: OnboardingStep, enabled: boolean) => {
      const toggled = enabled ? [...config.steps, step] : config.steps.filter((s) => s !== step);
      const ordered = STEPS.map((s) => s.step).filter((s) => toggled.includes(s));
      onConfigChange({ ...config, steps: ordered });
    },
    [config, onConfigChange]
  );

  const handleConnectorChange = useCallback(
    (step: OnboardingStep, newConnectorId: string) => {
      const key = STEP_CONNECTOR_KEY[step];
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
      <EuiFlexGroup direction="column" gutterSize="m" css={popoverContentStyle}>
        {STEPS.map(({ step, label }) => (
          <EuiFlexItem key={step}>
            <StepRow
              step={step}
              label={label}
              enabled={config.steps.includes(step)}
              displayConnectorId={displayConnectors[STEP_CONNECTOR_KEY[step]]}
              connectorList={connectorList}
              connectorError={connectorError}
              onToggle={handleToggle}
              onConnectorChange={handleConnectorChange}
            />
          </EuiFlexItem>
        ))}
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
