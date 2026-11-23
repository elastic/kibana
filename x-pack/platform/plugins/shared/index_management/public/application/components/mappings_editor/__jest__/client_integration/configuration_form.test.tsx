/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ComponentProps } from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppDependencies } from '../../../..';
import { ConfigurationForm } from '../../components/configuration_form';
import { WithAppDependencies } from './helpers/setup_environment';
import { loadSyntheticSourceStatus } from '../../../../services/api';

jest.mock('../../../../services/api', () => ({
  loadSyntheticSourceStatus: jest.fn(),
}));

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
const loadSyntheticSourceStatusMock = jest.mocked(loadSyntheticSourceStatus);

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

const getContext = (
  sourceFieldEnabled: boolean = true,
  hasAtLeastEnterpriseLicense: boolean = false
) =>
  ({
    config: {
      enableMappingsSourceFieldSection: sourceFieldEnabled,
    },
    hasAtLeastEnterpriseLicense,
  } as unknown as AppDependencies);

describe('Mappings editor: configuration form', () => {
  beforeEach(() => {
    loadSyntheticSourceStatusMock.mockResolvedValue({
      syntheticSourceFallbackToStoredSource: false,
    });
  });

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

    it('has synthetic option if the license allows it and fallback is disabled', async () => {
      setup({ esNodesPlugins: [] }, getContext(true, true));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      expect(await screen.findByTestId('syntheticSourceFieldOption')).toBeInTheDocument();
    });

    it("doesn't have synthetic option if the license doesn't allow it", async () => {
      setup({ esNodesPlugins: [] }, getContext(true, false));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      await screen.findByTestId('storedSourceFieldOption');
      expect(screen.queryByTestId('syntheticSourceFieldOption')).not.toBeInTheDocument();
    });

    it("doesn't have synthetic option if fallback to stored source is enabled", async () => {
      loadSyntheticSourceStatusMock.mockResolvedValue({
        syntheticSourceFallbackToStoredSource: true,
      });

      setup({ esNodesPlugins: [] }, getContext(true, true));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      await screen.findByTestId('storedSourceFieldOption');
      expect(screen.queryByTestId('syntheticSourceFieldOption')).not.toBeInTheDocument();
    });

    it("doesn't have synthetic option if fallback status fails to load", async () => {
      loadSyntheticSourceStatusMock.mockRejectedValue(new Error('Unable to load fallback status'));

      setup({ esNodesPlugins: [] }, getContext(true, true));

      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      await screen.findByTestId('storedSourceFieldOption');
      expect(screen.queryByTestId('syntheticSourceFieldOption')).not.toBeInTheDocument();
    });

    describe('synthetic _source default for logsdb index mode', () => {
      it('applies the synthetic default once the status request resolves', async () => {
        setup({ esNodesPlugins: [], indexMode: 'logsdb' }, getContext(true, true));

        await waitFor(() =>
          expect(screen.getByTestId('sourceValueField')).toHaveTextContent(/synthetic/i)
        );
      });

      it('keeps the option selected by the user while the status request is pending', async () => {
        let resolveStatus: (value: { syntheticSourceFallbackToStoredSource: boolean }) => void;
        loadSyntheticSourceStatusMock.mockReturnValue(
          new Promise((resolve) => {
            resolveStatus = resolve;
          })
        );

        setup({ esNodesPlugins: [], indexMode: 'logsdb' }, getContext(true, true));

        // The user picks "Disabled _source" before the status request resolves
        fireEvent.click(screen.getByTestId('sourceValueField'));
        fireEvent.click(await screen.findByTestId('disabledSourceFieldOption'));
        expect(screen.getByTestId('sourceValueField')).toHaveTextContent(/disabled/i);

        await act(async () => {
          resolveStatus({ syntheticSourceFallbackToStoredSource: false });
        });

        // The synthetic default must not override the user's selection
        expect(screen.getByTestId('sourceValueField')).toHaveTextContent(/disabled/i);
        expect(screen.getByTestId('sourceValueField')).not.toHaveTextContent(/synthetic/i);
      });
    });
  });
});
