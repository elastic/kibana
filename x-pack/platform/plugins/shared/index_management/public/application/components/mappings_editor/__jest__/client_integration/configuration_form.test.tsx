/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppDependencies } from '../../../..';
import { ConfigurationForm } from '../../components/configuration_form';
import { WithAppDependencies } from './helpers/setup_environment';

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

type ConfigurationFormProps = ComponentProps<typeof ConfigurationForm>;

const setup = (
  props: Partial<ConfigurationFormProps> = { esNodesPlugins: [] },
  appDependencies?: Partial<AppDependencies>
) => {
  const Component = WithAppDependencies(ConfigurationForm, appDependencies, {});
  return render(
    <I18nProvider>
      <Component {...props} />
    </I18nProvider>
  );
};

const getContext = (sourceFieldEnabled: boolean = true, canUseSyntheticSource: boolean = true) =>
  ({
    config: {
      enableMappingsSourceFieldSection: sourceFieldEnabled,
    },
    canUseSyntheticSource,
  } as unknown as AppDependencies);

describe('Mappings editor: configuration form', () => {
  it('renders the form', () => {
    const ctx = {
      config: {
        enableMappingsSourceFieldSection: true,
      },
    } as unknown as AppDependencies;

    setup({ esNodesPlugins: [] }, ctx);

    expect(screen.getByTestId('advancedConfiguration')).toBeInTheDocument();
  });

  describe('_source field', () => {
    it('renders the _source field when it is enabled', () => {
      setup({ esNodesPlugins: [] }, getContext());

      expect(screen.getByTestId('sourceField')).toBeInTheDocument();
    });

    it("doesn't render the _source field when it is disabled", () => {
      setup({ esNodesPlugins: [] }, getContext(false));

      expect(screen.queryByTestId('sourceField')).not.toBeInTheDocument();
    });

    it('has synthetic option if `canUseSyntheticSource` is set to true', async () => {
      setup({ esNodesPlugins: [] }, getContext(true, true));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      expect(await screen.findByTestId('syntheticSourceFieldOption')).toBeInTheDocument();
    });

    it("doesn't have synthetic option if `canUseSyntheticSource` is set to false", async () => {
      setup({ esNodesPlugins: [] }, getContext(true, false));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      await screen.findByTestId('storedSourceFieldOption');
      expect(screen.queryByTestId('syntheticSourceFieldOption')).not.toBeInTheDocument();
    });
  });
});
