/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { API_BASE_PATH } from '../../../common/constants';
import { getComposableTemplate } from '../../../test/fixtures';
import { setupEnvironment, WithAppDependencies } from '../helpers';

import { TEMPLATE_NAME, INDEX_PATTERNS as DEFAULT_INDEX_PATTERNS } from './constants';
import { TemplateClone } from '../../../public/application/sections/template_clone';

jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');
  return {
    ...original,
    // Mocking CodeEditor, which uses React Monaco under the hood
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        data-currentvalue={props.value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          props.onChange(e.target.value);
        }}
      />
    ),
  };
});

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');

  return {
    ...original,
    // Mocking EuiComboBox, as it utilizes "react-virtualized" for rendering search suggestions,
    // which does not produce a valid component wrapper
    EuiComboBox: (props: any) => (
      <input
        data-test-subj="mockComboBox"
        onChange={(syntheticEvent: React.ChangeEvent<HTMLInputElement>) => {
          // RTL fireEvent creates DOM event with target.value
          props.onChange([
            { label: syntheticEvent.target.value, value: syntheticEvent.target.value },
          ]);
        }}
      />
    ),
  };
});

const templateToClone = getComposableTemplate({
  name: TEMPLATE_NAME,
  indexPatterns: ['indexPattern1'],
  template: {},
  allowAutoCreate: 'TRUE',
});

/**
 * Helper to render template clone component with routing (RTL).
 */
const renderTemplateClone = (httpSetup: any) => {
  const CloneWithRouter = () => (
    <MemoryRouter initialEntries={[`/clone_template/${TEMPLATE_NAME}`]}>
      <Route path="/clone_template/:name" component={TemplateClone} />
    </MemoryRouter>
  );

  return render(React.createElement(WithAppDependencies(CloneWithRouter, httpSetup)));
};

/**
 * Helper to fill form step-by-step.
 */
const completeStep = {
  async one({ indexPatterns, priority, allowAutoCreate, version, lifecycle }: any = {}) {
    if (indexPatterns) {
      const combobox = screen.getByTestId('mockComboBox');
      indexPatterns.forEach((pattern: string) => {
        fireEvent.change(combobox, { target: { value: pattern } });
      });
    }

    if (priority !== undefined) {
      const priorityRow = screen.getByTestId('priorityField');
      const priorityInput = within(priorityRow).getByRole('spinbutton');
      fireEvent.change(priorityInput, { target: { value: String(priority) } });
    }

    if (version !== undefined) {
      const versionRow = screen.getByTestId('versionField');
      const versionInput = within(versionRow).getByRole('spinbutton');
      fireEvent.change(versionInput, { target: { value: String(version) } });
    }

    if (lifecycle) {
      const lifecycleSwitchRow = screen.getByTestId('dataRetentionToggle');
      const lifecycleSwitch = within(lifecycleSwitchRow).getByRole('switch');
      fireEvent.click(lifecycleSwitch);

      await screen.findByTestId('valueDataRetentionField');

      const retentionInput = screen.getByTestId('valueDataRetentionField');
      fireEvent.change(retentionInput, { target: { value: String(lifecycle.value) } });
    }

    if (allowAutoCreate) {
      const autoCreateRow = screen.getByTestId('allowAutoCreateField');

      let labelMatch = /Do not overwrite/;
      if (allowAutoCreate === 'TRUE') labelMatch = /True/;
      if (allowAutoCreate === 'FALSE') labelMatch = /False/;

      const radio = within(autoCreateRow).getByLabelText(labelMatch);
      fireEvent.click(radio);
    }

    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepComponents');
  },
  async two() {
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepSettings');
  },
  async three(settingsJson?: string) {
    if (settingsJson) {
      const editor = screen.getByTestId('settingsEditor');
      fireEvent.change(editor, { target: { value: settingsJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('stepMappings');
  },
  async four() {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await screen.findByTestId('documentFields');
    await waitFor(() => expect(screen.getByTestId('nextButton')).toBeEnabled());
    await user.click(screen.getByTestId('nextButton'));
    await screen.findByTestId('stepAliases');
  },
  async five(aliasesJson?: string) {
    if (aliasesJson) {
      const editor = screen.getByTestId('aliasesEditor');
      fireEvent.change(editor, { target: { value: aliasesJson } });
    }
    fireEvent.click(screen.getByTestId('nextButton'));
    jest.advanceTimersByTime(0);
    await screen.findByTestId('summaryTabContent');
  },
};

describe('<TemplateClone />', () => {
  const { httpSetup, httpRequestsMockHelpers } = setupEnvironment();

  beforeAll(() => {
    jest.useFakeTimers();
    httpRequestsMockHelpers.setLoadTelemetryResponse({});
    httpRequestsMockHelpers.setLoadComponentTemplatesResponse([]);
    httpRequestsMockHelpers.setLoadTemplateResponse(templateToClone.name, templateToClone);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  // RTL test - migrated
  describe('page title (RTL)', () => {
    beforeEach(async () => {
      // Clear mocks
      httpSetup.get.mockClear();
      httpSetup.post.mockClear();

      await act(async () => {
        renderTemplateClone(httpSetup);
      });
      await screen.findByTestId('pageTitle');
    });

    test('should set the correct page title', () => {
      expect(screen.getByTestId('pageTitle')).toBeInTheDocument();
      expect(screen.getByTestId('pageTitle')).toHaveTextContent(
        `Clone template '${templateToClone.name}'`
      );
    });
  });

  describe('form payload', () => {
    beforeEach(async () => {
      // Clear mocks
      httpSetup.get.mockClear();
      httpSetup.post.mockClear();

      renderTemplateClone(httpSetup);
      await screen.findByTestId('pageTitle');

      // Logistics
      // Specify index patterns, but do not change name (keep default)
      await completeStep.one({
        indexPatterns: DEFAULT_INDEX_PATTERNS,
      });
      // Component templates
      await completeStep.two();
      // Index settings
      await completeStep.three();
      // Mappings
      await completeStep.four();
      // Aliases
      await completeStep.five();
    });

    it('should send the correct payload', async () => {
      fireEvent.click(screen.getByTestId('nextButton'));

      const { template, indexMode, priority, version, _kbnMeta, allowAutoCreate } = templateToClone;
      await waitFor(() => {
        expect(httpSetup.post).toHaveBeenLastCalledWith(
          `${API_BASE_PATH}/index_templates`,
          expect.objectContaining({
            body: JSON.stringify({
              name: `${templateToClone.name}-copy`,
              indexPatterns: DEFAULT_INDEX_PATTERNS,
              priority,
              version,
              allowAutoCreate,
              indexMode,
              _kbnMeta,
              template,
            }),
          })
        );
      });
    });
  });
});
