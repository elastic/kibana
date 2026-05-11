/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { HorizontalMinimalStepper, type MinimalStep } from './horizontal_minimal_stepper';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { ComposeDiscoverMode } from './types';
import { useComposeDiscoverState, getStepTitles, getSandboxTabConfig } from './use_compose_discover_state';
import { ComposeDiscoverForm } from './compose_discover_form';
import { ComposeDiscoverChild } from './compose_discover_child';

export interface ComposeDiscoverFlyoutProps {
  historyKey: symbol;
  mode?: ComposeDiscoverMode;
  initialQuery?: string;
  onClose: () => void;
  services: RuleFormServices;
}

const FLYOUT_TITLE_ID = 'composeDiscoverFlyoutTitle';

const YAML_TOGGLE_OPTIONS = [
  { id: 'form', label: 'Form', iconType: 'tableDensityNormal' },
  { id: 'yaml', label: 'YAML', iconType: 'editorCodeBlock' },
];


export const ComposeDiscoverFlyout: React.FC<ComposeDiscoverFlyoutProps> = ({
  historyKey,
  mode = 'create',
  initialQuery,
  onClose,
  services,
}) => {
  const [state, dispatch] = useComposeDiscoverState(mode);

  React.useEffect(() => {
    if (initialQuery) {
      dispatch({ type: 'SET_FULL_QUERY', query: initialQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCreate = mode === 'create';
  const title = isCreate ? 'Create alert rule' : 'Edit alert rule';

  const stepTitles = getStepTitles(state);
  const isLastStep = state.step === stepTitles.length - 1;
  const tabConfig = getSandboxTabConfig(state);

  return (
    <EuiFlyout
      type="overlay"
      session="start"
      historyKey={historyKey}
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      size={480}
    >
        <EuiFlyoutHeader hasBorder>
            {/* Title */}
            <EuiTitle size="s" id={FLYOUT_TITLE_ID}>
              <h2>{title}</h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            {/* Stepper row — standard EuiFlexGroup handles layout alongside the toggle */}
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow>
                {state.yamlMode ? (
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="warning">YAML MODE</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ) : (
                  <HorizontalMinimalStepper
                    steps={stepTitles.map((title, i): MinimalStep => ({
                      title,
                      status: i < state.step ? 'complete' : i === state.step ? 'current' : 'incomplete',
                    }))}
                    animated
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonGroup
                  legend="Form or YAML view"
                  options={YAML_TOGGLE_OPTIONS}
                  idSelected={state.yamlMode ? 'yaml' : 'form'}
                  onChange={(id) =>
                    dispatch({ type: 'SET_YAML_MODE', enabled: id === 'yaml' })
                  }
                  buttonSize="compressed"
                  isIconOnly
                  data-test-subj="composeDiscoverYamlToggle"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>

          <EuiFlyoutBody>
            <ComposeDiscoverForm state={state} dispatch={dispatch} services={services} />
          </EuiFlyoutBody>

          <EuiFlyoutFooter>
            {state.yamlMode ? (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    onClick={() => dispatch({ type: 'SET_YAML_MODE', enabled: false })}
                  >
                    Cancel YAML
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton fill data-test-subj="composeDiscoverYamlSave">
                    Save
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : (
              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" responsive={false}>
                    {state.step > 0 && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          iconType="arrowLeft"
                          onClick={() => dispatch({ type: 'GO_BACK' })}
                          data-test-subj="composeDiscoverBack"
                        >
                          Back
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                    <EuiFlexItem grow={false}>
                      {isLastStep ? (
                        <EuiButton fill data-test-subj="composeDiscoverSubmit">
                          {isCreate ? 'Create rule' : 'Save rule'}
                        </EuiButton>
                      ) : (
                        <EuiButton
                          fill
                          iconType="arrowRight"
                          iconSide="right"
                          isDisabled={state.childOpen}
                          onClick={() => dispatch({ type: 'GO_NEXT' })}
                          data-test-subj="composeDiscoverNext"
                        >
                          Next
                        </EuiButton>
                      )}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlyoutFooter>
        {state.childOpen && (
          <ComposeDiscoverChild
            state={state}
            dispatch={dispatch}
            services={services}
            tabConfig={tabConfig}
            onClose={() => dispatch({ type: 'CLOSE_CHILD' })}
          />
        )}
      </EuiFlyout>
  );
};

