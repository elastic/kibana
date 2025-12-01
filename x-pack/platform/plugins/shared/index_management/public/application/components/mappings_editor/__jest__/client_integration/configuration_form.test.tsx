/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { AppDependencies } from '../../../..';
import { ConfigurationForm } from '../../components/configuration_form';
import { WithAppDependencies } from './helpers/setup_environment';

const setup = (props: any = { onUpdate() {} }, appDependencies?: any) => {
  const Component = WithAppDependencies(ConfigurationForm, appDependencies);
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

    it('has synthetic option if `canUseSyntheticSource` is set to true', () => {
      setup({ esNodesPlugins: [] }, getContext(true, true));

      // Clicking on the field to open the options dropdown
      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      expect(screen.getByTestId('syntheticSourceFieldOption')).toBeInTheDocument();
    });

    it("doesn't have synthetic option if `canUseSyntheticSource` is set to false", () => {
      setup({ esNodesPlugins: [] }, getContext(true, false));

      // Clicking on the field to open the options dropdown
      const sourceValueField = screen.getByTestId('sourceValueField');
      fireEvent.click(sourceValueField);

      expect(screen.queryByTestId('syntheticSourceFieldOption')).not.toBeInTheDocument();
    });
  });
});
