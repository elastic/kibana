/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { serializeAsESLifecycle } from '../../../../../../common/lib';

let mockWizardData: any;

jest.mock('../../component_templates_context', () => ({
  useComponentTemplatesContext: () => ({
    documentation: { esDocsBase: 'https://example.test' },
  }),
}));

jest.mock('@kbn/es-ui-shared-plugin/public', () => {
  const actual = jest.requireActual('@kbn/es-ui-shared-plugin/public');
  return {
    ...actual,
    Forms: {
      ...actual.Forms,
      FormWizard: ({ onSave, apiError }: { onSave: (data: any) => void; apiError?: any }) => (
        <div>
          {apiError}
          <button
            type="button"
            data-test-subj="mockSaveButton"
            onClick={() => onSave(mockWizardData)}
          >
            save
          </button>
        </div>
      ),
      FormWizardStep: () => null,
    },
  };
});

import { ComponentTemplateForm } from './component_template_form';

describe('<ComponentTemplateForm />', () => {
  beforeEach(() => {
    mockWizardData = undefined;
  });

  test('should build the correct payload when submitting the form', async () => {
    const onSave = jest.fn();
    const clearSaveError = jest.fn();

    mockWizardData = {
      logistics: {
        name: 'comp-1',
        lifecycle: { enabled: true, value: 2, unit: 'd' },
      },
      settings: { number_of_shards: 1 },
      mappings: { properties: { boolean_datatype: { type: 'boolean' } } },
      aliases: { my_alias: {} },
    };

    render(
      <I18nProvider>
        <ComponentTemplateForm
          onSave={onSave}
          clearSaveError={clearSaveError}
          isSaving={false}
          saveError={null}
        />
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('mockSaveButton'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];

    expect(saved).toEqual(
      expect.objectContaining({
        name: 'comp-1',
        template: {
          settings: { number_of_shards: 1 },
          mappings: { properties: { boolean_datatype: { type: 'boolean' } } },
          aliases: { my_alias: {} },
          lifecycle: serializeAsESLifecycle({ enabled: true, value: 2, unit: 'd' }),
        },
        _kbnMeta: { usedBy: [], isManaged: false },
      })
    );
    expect(saved._meta).toBeUndefined();
    expect(saved.version).toBeUndefined();
    expect(clearSaveError).toHaveBeenCalled();
  });

  test('should surface API errors if the request is unsuccessful', async () => {
    const onSave = jest.fn();
    const clearSaveError = jest.fn();

    const error = {
      statusCode: 409,
      error: 'Conflict',
      message: "There is already a template with name 'comp-1'",
    };

    render(
      <I18nProvider>
        <ComponentTemplateForm
          onSave={onSave}
          clearSaveError={clearSaveError}
          isSaving={false}
          saveError={error}
        />
      </I18nProvider>
    );

    expect(await screen.findByTestId('saveComponentTemplateError')).toBeInTheDocument();
    expect(screen.getByTestId('saveComponentTemplateError')).toHaveTextContent(error.message);
  });
});
