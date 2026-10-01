/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { docLinksServiceMock } from '@kbn/core/public/mocks';

import { documentationService } from '../../../../services/documentation';
import { AppContextProvider, type AppDependencies } from '../../../../app_context';
import { MappingsEditorProvider } from '../../mappings_editor_context';
import { ConfigurationForm } from './configuration_form';

jest.mock('@kbn/es-ui-shared-plugin/static/forms/components', () => {
  const original = jest.requireActual('@kbn/es-ui-shared-plugin/static/forms/components');
  return {
    ...original,
    // JsonEditorField pulls in the shared-ux code editor (Monaco) which requires Canvas/Suspense.
    // For this suite we only care about configuration options, not editor rendering.
    JsonEditorField: ({ codeEditorProps }: { codeEditorProps?: Record<string, unknown> }) => (
      <div
        data-test-subj={(codeEditorProps?.['data-test-subj'] as string) ?? 'mockJsonEditorField'}
      />
    ),
  };
});

const appDependencies = {
  config: {
    enableMappingsSourceFieldSection: true,
  },
  hasAtLeastEnterpriseLicense: false,
} as unknown as AppDependencies;

const setup = (props: Partial<React.ComponentProps<typeof ConfigurationForm>>) =>
  render(
    <I18nProvider>
      <AppContextProvider value={appDependencies}>
        <MappingsEditorProvider>
          <ConfigurationForm esNodesPlugins={[]} {...props} />
        </MappingsEditorProvider>
      </AppContextProvider>
    </I18nProvider>
  );

describe('ConfigurationForm: _size field (mapper-size plugin)', () => {
  beforeAll(() => {
    documentationService.setup(docLinksServiceMock.createStartContract());
  });

  it('renders the _size parameter when the mapper size plugin is installed', () => {
    setup({ esNodesPlugins: ['mapper-size'] });

    expect(screen.getByTestId('sizeEnabledToggle')).toBeInTheDocument();
  });

  it("doesn't render the _size parameter when the mapper size plugin is not installed", () => {
    setup({ esNodesPlugins: ['unrelated-plugin'] });

    expect(screen.queryByTestId('sizeEnabledToggle')).not.toBeInTheDocument();
  });

  it('renders the _size parameter when the mappings define _size, even without the plugin', () => {
    setup({ esNodesPlugins: [], value: { _size: { enabled: false } } });

    expect(screen.getByTestId('sizeEnabledToggle')).toBeInTheDocument();
  });
});
