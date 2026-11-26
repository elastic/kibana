/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import React, { createRef } from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { SetupWizardStepLayout } from './setup_wizard_step_layout';
import type {
  SetupWizardStep,
  SetupWizardStepContentProps,
  SetupWizardStepLayoutControls,
} from './types';

export const testAiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const TestStepContent = ({ layout }: SetupWizardStepContentProps) => (
  <SetupWizardStepLayout {...layout}>
    <div data-test-subj={`testStepBody-${layout.step.id}`} />
  </SetupWizardStepLayout>
);

/** A step that is not a real one, so tests of the wizard frame don't break when real steps change. */
export const createTestStep = ({
  id,
  ...overrides
}: Partial<SetupWizardStep> & { id: string }): SetupWizardStep => ({
  id,
  texts: {
    stepTitle: `Step ${id}`,
    title: `Title ${id}`,
    description: `Description ${id}`,
    docsLinkLabel: `Docs ${id}`,
  },
  getDocsLink: ({ overview }) => overview,
  isDone: () => false,
  Content: TestStepContent,
  ...overrides,
});

export const createTestLayoutControls = (
  step: SetupWizardStep,
  overrides: Partial<SetupWizardStepLayoutControls> = {}
): SetupWizardStepLayoutControls => ({
  step,
  headingRef: createRef<HTMLHeadingElement>(),
  isDone: false,
  isFirstStep: false,
  isLastStep: false,
  isBusy: false,
  onBack: jest.fn(),
  onSkip: jest.fn(),
  onExit: jest.fn(),
  onContinue: jest.fn(),
  ...overrides,
});

export const renderWithServices = (ui: ReactElement) => {
  const services = coreMock.createStart();
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>{ui}</KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return services;
};
