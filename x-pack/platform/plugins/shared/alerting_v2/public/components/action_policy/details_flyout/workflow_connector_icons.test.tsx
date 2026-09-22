/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { WorkflowYaml } from '@kbn/workflows';
import { getWorkflowConnectorTypes, WorkflowConnectorIcons } from './workflow_connector_icons';
import { MockWorkflowsUiServicesProvider } from '../../../test_utils/test_providers';

// `getWorkflowConnectorTypes` is pure. `TypeIcon` reads the step/connector icon
// registries from context, so the render helper supplies the mock provider.
const renderIcons = (types: string[]) =>
  render(
    <I18nProvider>
      <MockWorkflowsUiServicesProvider>
        <WorkflowConnectorIcons types={types} />
      </MockWorkflowsUiServicesProvider>
    </I18nProvider>
  );

describe('getWorkflowConnectorTypes', () => {
  it('returns connector types for flat steps', () => {
    const definition = {
      steps: [
        { type: '.email', name: 'send email' },
        { type: '.slack', name: 'send slack' },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['email', 'slack']);
  });

  it('collects types from nested if.steps and else (steps at the top level of the if step)', () => {
    // The IfStep schema puts `steps` and `else` directly on the step object,
    // not under an `if` property. collectAllSteps uses isIfStep + step.steps / step.else.
    const definition = {
      steps: [
        {
          type: 'if',
          name: 'branch',
          condition: '${{ true }}',
          steps: [{ type: '.email', name: 'email in if' }],
          else: [{ type: '.slack', name: 'slack in else' }],
        },
      ],
    } as unknown as WorkflowYaml;

    const types = getWorkflowConnectorTypes(definition);
    expect(types).toContain('email');
    expect(types).toContain('slack');
  });

  it('collects types from nested foreach.steps (steps at the top level of the foreach step)', () => {
    // ForEachStepConfigSchema puts `steps` directly on the foreach step.
    const definition = {
      steps: [
        {
          type: 'foreach',
          name: 'loop',
          foreach: '{{ items }}',
          steps: [{ type: 'elasticsearch.search', name: 'search' }],
        },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['elasticsearch']);
  });

  it('deduplicates — slack.postMessage and slack_api.sendMessage both become slack', () => {
    const definition = {
      steps: [
        { type: 'slack.postMessage', name: 'slack 1' },
        { type: 'slack_api.sendMessage', name: 'slack 2' },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['slack']);
  });

  it('preserves first-seen order', () => {
    const definition = {
      steps: [
        { type: '.email', name: 'email' },
        { type: 'elasticsearch.index', name: 'es' },
        { type: '.slack', name: 'slack' },
      ],
    } as unknown as WorkflowYaml;

    expect(getWorkflowConnectorTypes(definition)).toEqual(['email', 'elasticsearch', 'slack']);
  });

  it('returns [] for null definition', () => {
    expect(getWorkflowConnectorTypes(null)).toEqual([]);
  });

  it('returns [] for undefined definition', () => {
    expect(getWorkflowConnectorTypes(undefined)).toEqual([]);
  });

  it('returns [] when steps is not an array', () => {
    expect(getWorkflowConnectorTypes({ steps: undefined } as unknown as WorkflowYaml)).toEqual([]);
  });

  it('skips steps with no type and does not throw', () => {
    const definition = {
      steps: [{ name: 'broken' }, { type: '.email', name: 'email' }],
    } as unknown as WorkflowYaml;

    expect(() => getWorkflowConnectorTypes(definition)).not.toThrow();
    expect(getWorkflowConnectorTypes(definition)).toEqual(['email']);
  });
});

describe('WorkflowConnectorIcons', () => {
  it('renders a group with one flex item per distinct connector type', () => {
    renderIcons(['email', 'slack', 'elasticsearch']);

    const group = screen.getByTestId('actionPolicyDestinationConnectorIcons');
    expect(group).toBeInTheDocument();
    // Three flex items — one per type
    expect(group.children.length).toBe(3);
  });

  it('caps at 4 visible icons and shows +N for the rest', () => {
    renderIcons(['elasticsearch', 'email', 'slack', 'kibana', 'http', 'pagerduty']);

    // 4 visible + 1 overflow flex item
    const group = screen.getByTestId('actionPolicyDestinationConnectorIcons');
    expect(group.children.length).toBe(5);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders null (empty DOM) when types is empty', () => {
    const { container } = renderIcons([]);
    expect(container).toBeEmptyDOMElement();
  });
});
