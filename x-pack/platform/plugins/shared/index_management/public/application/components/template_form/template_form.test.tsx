/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import * as fixtures from '../../../../test/fixtures';
import { serializeAsESLifecycle } from '../../../../common/lib';
import type { WizardContent } from './template_form';
import { TemplateForm } from './template_form';
import { setupEnvironment } from '../../../../__jest__/client_integration/helpers/setup_environment';

jest.mock('@kbn/code-editor');

let mockWizardData: WizardContent | undefined;

jest.mock('@kbn/es-ui-shared-plugin/public', () => {
  const actual = jest.requireActual('@kbn/es-ui-shared-plugin/public');
  return {
    ...actual,
    Forms: {
      ...actual.Forms,
      FormWizard: ({
        onSave,
        apiError,
      }: {
        onSave: (data: WizardContent) => void;
        apiError?: React.ReactNode;
      }) => (
        <div>
          {apiError}
          <button
            type="button"
            data-test-subj="mockSaveButton"
            onClick={() => onSave(mockWizardData!)}
          >
            save
          </button>
        </div>
      ),
      FormWizardStep: () => null,
    },
  };
});

describe('<TemplateForm />', () => {
  beforeEach(() => {
    mockWizardData = undefined;
  });

  test('keeps data stream configuration when saving', async () => {
    const { httpSetup } = setupEnvironment();

    const onSave = jest.fn();
    const clearSaveError = jest.fn();

    const templateToEdit = fixtures.getTemplate({
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {
        hidden: true,
        anyUnknownKey: 'should_be_kept',
      },
    });

    mockWizardData = {
      logistics: {
        name: templateToEdit.name,
        indexPatterns: templateToEdit.indexPatterns,
        version: 1,
        allowAutoCreate: 'NO_OVERWRITE',
        dataStream: templateToEdit.dataStream,
        indexMode: 'standard',
        lifecycle: { enabled: true, value: 1, unit: 'd' },
      },
      components: [],
      settings: undefined,
      mappings: undefined,
      aliases: undefined,
    };

    const Comp = () => (
      <I18nProvider>
        <TemplateForm
          title="Edit template"
          defaultValue={templateToEdit}
          isEditing={true}
          onSave={onSave}
          clearSaveError={clearSaveError}
          isSaving={false}
          saveError={null}
        />
      </I18nProvider>
    );

    render(
      <GlobalFlyout.GlobalFlyoutProvider>
        <Comp />
      </GlobalFlyout.GlobalFlyoutProvider>
    );

    fireEvent.click(screen.getByTestId('mockSaveButton'));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];

    expect(saved).toEqual(
      expect.objectContaining({
        name: templateToEdit.name,
        indexPatterns: templateToEdit.indexPatterns,
        version: 1,
        allowAutoCreate: 'NO_OVERWRITE',
        dataStream: {
          hidden: true,
          anyUnknownKey: 'should_be_kept',
        },
        indexMode: 'standard',
        _kbnMeta: templateToEdit._kbnMeta,
        template: {
          lifecycle: serializeAsESLifecycle({ enabled: true, value: 1, unit: 'd' }),
        },
      })
    );

    expect(saved.lifecycle).toBeUndefined();
    expect(clearSaveError).toHaveBeenCalled();
  });
});
