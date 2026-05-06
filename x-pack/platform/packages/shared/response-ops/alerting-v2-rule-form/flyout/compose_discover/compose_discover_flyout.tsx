/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import type { ComposeDiscoverMode } from './types';
import { useComposeDiscoverState } from './use_compose_discover_state';
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
  { id: 'form', label: 'Form' },
  { id: 'yaml', label: 'YAML' },
];

export const ComposeDiscoverFlyout: React.FC<ComposeDiscoverFlyoutProps> = ({
  historyKey,
  mode = 'create',
  initialQuery,
  onClose,
  services,
}) => {
  const [state, dispatch] = useComposeDiscoverState(mode);
  const clickedRef = useRef(false);

  React.useEffect(() => {
    if (initialQuery) {
      dispatch({ type: 'SET_FULL_QUERY', query: initialQuery });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFocusCapture = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      if (clickedRef.current) return;
      const from = e.relatedTarget as HTMLElement | null;
      if (from && !e.currentTarget.contains(from)) {
        (e.target as HTMLElement).blur();
        from.focus({ preventScroll: true });
      }
    },
    []
  );

  const isCreate = mode === 'create';
  const title = isCreate ? 'Create alert rule' : 'Edit alert rule';

  if (state.childOpen) {
    return (
      <ComposeDiscoverChild
        state={state}
        dispatch={dispatch}
        services={services}
        onClose={() => dispatch({ type: 'CLOSE_CHILD' })}
      />
    );
  }

  return (
    <EuiFlyout
      type="push"
      onClose={onClose}
      aria-labelledby={FLYOUT_TITLE_ID}
      size="l"
      maxWidth={600}
    >
      <div
        style={{ display: 'contents' }}
        onPointerDown={() => {
          clickedRef.current = true;
        }}
        onPointerUp={() => {
          clickedRef.current = false;
        }}
        onFocusCapture={onFocusCapture}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m" id={FLYOUT_TITLE_ID}>
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonGroup
                legend="Form or YAML view"
                options={YAML_TOGGLE_OPTIONS}
                idSelected={state.yamlMode ? 'yaml' : 'form'}
                onChange={(id) => dispatch({ type: 'SET_YAML_MODE', enabled: id === 'yaml' })}
                buttonSize="compressed"
                data-test-subj="composeDiscoverYamlToggle"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <ComposeDiscoverForm state={state} dispatch={dispatch} />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill data-test-subj="composeDiscoverSubmit">
                {isCreate ? 'Create rule' : 'Save'}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </div>
    </EuiFlyout>
  );
};
