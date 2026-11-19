/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux-v7';
import { I18nProvider } from '@kbn/i18n-react';
import type { ConnectorContractUnion } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import { resetStepConfigPanelSessionStateForTests, StepConfigPanel } from './step_config_panel';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';

jest.mock('@kbn/code-editor', () =>
  jest.requireActual('../test_utils/mock_code_editor').createCodeEditorModuleMock()
);
jest.mock('@kbn/monaco', () => ({
  XJSON_LANG_ID: 'xjson',
  YAML_LANG_ID: 'yaml',
  ESQL_LANG_ID: 'esql',
}));
jest.mock('@kbn/workflows-ui', () =>
  jest.requireActual('../test_utils/mock_workflows_ui').createWorkflowsUiModuleMock()
);
jest.mock('../../../shared/ui/step_icons/step_icon', () => ({
  StepIcon: () => null,
}));
jest.mock('../model/use_step_output_samples', () => ({
  useStepOutputSamples: () => ({ byStep: {}, isFullRunInProgress: false }),
}));

const connectors = [
  {
    type: 'sample',
    hasConnectorId: false,
    paramsSchema: z.object({ text: z.string() }),
    outputSchema: z.unknown(),
    summary: 'Sample',
    description: null,
  } as unknown as ConnectorContractUnion,
];

/** No YAML error, but yaml refuses to turn it into data: each anchor fans out ten times over the last. */
const ALIAS_FAN_OUT = [
  'name: sample',
  'type: sample',
  'a: &a [x, x, x, x, x, x, x, x, x, x]',
  `b: &b [${Array(10).fill('*a').join(', ')}]`,
  `c: &c [${Array(10).fill('*b').join(', ')}]`,
  `d: [${Array(10).fill('*c').join(', ')}]`,
].join('\n');

const renderPanel = (initialFragment: string) =>
  render(
    <Provider store={createMockStore()}>
      <I18nProvider>
        <StepConfigPanel
          mode="edit"
          stepType="sample"
          initialFragment={initialFragment}
          connectors={connectors}
          onClose={jest.fn()}
          onRevert={jest.fn()}
          onFragmentChange={jest.fn()}
        />
      </I18nProvider>
    </Provider>
  );

describe('StepConfigPanel with a step YAML the form cannot edit', () => {
  beforeEach(() => {
    resetStepConfigPanelSessionStateForTests();
  });

  it('asks to fix the YAML, and offers no Advanced controls that would write into it', () => {
    renderPanel('name: sample\ntype: sample\nwith:\n  text: hi\nfoo: [\n');

    expect(screen.getByTestId('workflowStepConfigPanelFormBlocked')).toBeInTheDocument();
    expect(
      screen.queryByTestId('workflowStepConfigPanelAccordion-settings')
    ).not.toBeInTheDocument();
  });

  it('still renders the panel for YAML that parses but cannot be read as data', () => {
    renderPanel(ALIAS_FAN_OUT);

    expect(screen.getByTestId('workflowStepConfigPanel')).toBeInTheDocument();
    expect(screen.getByTestId('workflowStepConfigPanelFormBlocked')).toHaveTextContent(/alias/i);
  });

  it('offers the Advanced controls for YAML the form can edit', () => {
    renderPanel('name: sample\ntype: sample\nwith:\n  text: hi\n');

    expect(screen.getByTestId('workflowStepConfigPanelAccordion-settings')).toBeInTheDocument();
  });
});
