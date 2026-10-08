/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import {
  CreateDatasetAdditionalSettings,
  CreateDatasetFormatField,
} from './create_dataset_settings';
import type {
  CreateDatasetFormValues,
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../create_dataset_form_state';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_form_state';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';

const docLinksMock = {
  links: {
    dataFederation: {
      overview: '',
      quickstart: '',
      dataSources: '',
      datasets: '',
      datasetSettings: '',
      authentication: '',
      staticCredentials: '',
      federatedIdentity: '',
      querying: '',
      security: '',
    },
  },
};

const renderSettings = () => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: {
        name: '',
        description: '',
        data_source: '',
        resource: '',
        settings: emptyCreateDatasetSettingsFormValues(),
        ui: {
          formatWasAutoDetected: false,
          additionalCommonSettingsIsOpen: true,
          additionalAdvancedSettingsIsOpen: false,
        },
      },
    });
    const { control } = methods;

    const settings = useWatch({ control, name: 'settings' });

    return (
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ docLinks: docLinksMock }}>
            <FormProvider {...methods}>
              <CreateDatasetFormatField control={control} />
              <CreateDatasetAdditionalSettings control={control} />
              <div data-test-subj="settingsValue">{JSON.stringify(settings)}</div>
            </FormProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );
  };

  return render(<Wrapper />);
};

const getSettingsValue = (getByTestId: ReturnType<typeof render>['getByTestId']) =>
  JSON.parse(getByTestId('settingsValue').textContent ?? '{}');

describe('CreateDatasetSettings', () => {
  const openComboBox = async (
    getByTestId: ReturnType<typeof render>['getByTestId'],
    testId: string
  ) => {
    const combo = getByTestId(testId);
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });
  };

  const selectFormat = async (
    getByTestId: ReturnType<typeof render>['getByTestId'],
    format: string
  ) => {
    const optionTestId = `createDatasetSettingsFormatOption-${format}`;

    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsFormat'));
    });
    await waitFor(() => expect(getByTestId(optionTestId)).toBeInTheDocument());
    await act(async () => {
      fireEvent.click(getByTestId(optionTestId));
    });
  };

  it('shows the format select', () => {
    const { getByTestId } = renderSettings();
    expect(getByTestId('createDatasetSettingsFormat')).toBeVisible();
  });

  it('shows additional settings without a hide/show toggle', () => {
    const { getByTestId, queryByTestId } = renderSettings();

    expect(queryByTestId('createDatasetAdditionalSettingsToggle')).toBeNull();
    expect(getByTestId('createDatasetWizardAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeInTheDocument();
  });

  it('updates format in form state', async () => {
    const { getByTestId } = renderSettings();

    await selectFormat(getByTestId, 'parquet');

    expect(getSettingsValue(getByTestId)).toMatchObject({ format: 'parquet' });
  });

  it('updates partition_detection in form state', async () => {
    const { getByTestId } = renderSettings();

    await openComboBox(getByTestId, 'createDatasetSettingsPartitionDetection');
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsPartitionDetectionOption-hive'));
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'hive' });
  });

  it('supports partition_detection template in form state', async () => {
    const { getByTestId } = renderSettings();

    await openComboBox(getByTestId, 'createDatasetSettingsPartitionDetection');
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsPartitionDetectionOption-template'));
    });

    expect(getSettingsValue(getByTestId)).toMatchObject({ partition_detection: 'template' });
    expect(getByTestId('createDatasetSettingsPartitionPath')).toBeInTheDocument();
  });

  it('does not show schema_resolution', () => {
    const { queryByTestId } = renderSettings();

    expect(queryByTestId('createDatasetSettingsSchemaResolution')).toBeNull();
  });

  it('shows no format-specific fields when no format is selected', () => {
    const { queryByTestId } = renderSettings();
    // format-specific fields are not in the DOM until a format is chosen
    expect(queryByTestId('createDatasetSettingsSchemaSampleSize')).toBeNull();
    // API-only fields are never in the DOM
    expect(queryByTestId('createDatasetSettingsSegmentSize')).toBeNull();
  });

  describe('CSV format', () => {
    it('marks comma as the default delimiter option', async () => {
      const { getByTestId, getByText } = renderSettings();

      await selectFormat(getByTestId, 'csv');
      await openComboBox(getByTestId, 'createDatasetSettingsDelimiter');

      const commaLabel = await waitFor(() =>
        getByText(createDatasetWizardStrings.settingsDelimiterOptionComma)
      );
      const commaOption = commaLabel.closest('button') ?? commaLabel.parentElement;
      expect(commaOption).not.toBeNull();
      expect(commaOption).toHaveTextContent(createDatasetWizardStrings.defaultBadgeLabel);
    });

    it('marks quoted as the default quote mode', async () => {
      const { getByTestId } = renderSettings();

      await selectFormat(getByTestId, 'csv');
      await openComboBox(getByTestId, 'createDatasetSettingsMode');

      expect(
        within(getByTestId('createDatasetSettingsModeOption-quoted')).getByText(
          createDatasetWizardStrings.defaultBadgeLabel
        )
      ).toBeInTheDocument();
      expect(
        within(getByTestId('createDatasetSettingsModeOption-plain')).queryByText(
          createDatasetWizardStrings.defaultBadgeLabel
        )
      ).toBeNull();
    });

    it('shows delimiter, mode, and header_row at the top level (core)', async () => {
      const { getByTestId } = renderSettings();

      await selectFormat(getByTestId, 'csv');

      expect(getByTestId('createDatasetSettingsDelimiter')).toBeVisible();
      expect(getByTestId('createDatasetSettingsMode')).toBeVisible();
      expect(getByTestId('createDatasetSettingsHeaderRow')).toBeVisible();
    });

    it('updates a CSV core field in form state', async () => {
      const { getByTestId, getByText } = renderSettings();

      await selectFormat(getByTestId, 'csv');
      await openComboBox(getByTestId, 'createDatasetSettingsDelimiter');
      await act(async () => {
        fireEvent.click(getByText(createDatasetWizardStrings.settingsDelimiterOptionPipe));
      });

      expect(getSettingsValue(getByTestId)).toMatchObject({ delimiter: '|' });
    });
  });

  describe('TSV format', () => {
    it('marks tab as the default delimiter option', async () => {
      const { getByTestId, getByText } = renderSettings();

      await selectFormat(getByTestId, 'tsv');
      await openComboBox(getByTestId, 'createDatasetSettingsDelimiter');

      const tabLabel = await waitFor(() =>
        getByText(createDatasetWizardStrings.settingsDelimiterOptionTab)
      );
      const tabOption = tabLabel.closest('button') ?? tabLabel.parentElement;
      expect(tabOption).not.toBeNull();
      expect(tabOption).toHaveTextContent(createDatasetWizardStrings.defaultBadgeLabel);
    });

    it('marks plain as the default quote mode', async () => {
      const { getByTestId } = renderSettings();

      await selectFormat(getByTestId, 'tsv');
      await openComboBox(getByTestId, 'createDatasetSettingsMode');

      expect(
        within(getByTestId('createDatasetSettingsModeOption-plain')).getByText(
          createDatasetWizardStrings.defaultBadgeLabel
        )
      ).toBeInTheDocument();
      expect(
        within(getByTestId('createDatasetSettingsModeOption-quoted')).queryByText(
          createDatasetWizardStrings.defaultBadgeLabel
        )
      ).toBeNull();
    });
  });

  describe('NDJSON format', () => {
    it('shows datetime_format when NDJSON is selected', async () => {
      const { getByTestId } = renderSettings();

      await selectFormat(getByTestId, 'ndjson');

      expect(getByTestId('createDatasetSettingsDatetimeFormat')).toBeVisible();
    });

    it('does not show segment_size (API-only)', async () => {
      const { queryByTestId, getByTestId } = renderSettings();
      await selectFormat(getByTestId, 'ndjson');

      expect(queryByTestId('createDatasetSettingsSegmentSize')).toBeNull();
    });
  });
});

const renderAdditionalSettings = (
  format: DatasetFormatFormValue = '',
  errorMode: DatasetErrorModeFormValue = ''
) => {
  const Wrapper = () => {
    const methods = useForm<CreateDatasetFormValues>({
      defaultValues: {
        name: '',
        description: '',
        data_source: '',
        resource: '',
        settings: { ...emptyCreateDatasetSettingsFormValues(), format, error_mode: errorMode },
        ui: {
          formatWasAutoDetected: false,
          additionalCommonSettingsIsOpen: true,
          additionalAdvancedSettingsIsOpen: false,
        },
      },
    });

    return (
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ docLinks: docLinksMock }}>
            <FormProvider {...methods}>
              <CreateDatasetAdditionalSettings control={methods.control} />
            </FormProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );
  };

  return render(<Wrapper />);
};

describe('CreateDatasetAdditionalSettings', () => {
  it('shows shared common and advanced settings when no format is selected', () => {
    const { getByTestId, queryByTestId } = renderAdditionalSettings();

    expect(getByTestId('createDatasetWizardCommonSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSharedCommonSettings')).toBeInTheDocument();

    expect(getByTestId('createDatasetWizardAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSharedAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsFileExclusions')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsPartitionDetection')).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsPartitionPath')).toBeNull();
    expect(getByTestId('createDatasetSettingsErrorMode')).toBeInTheDocument();
    expect(queryByTestId('createDatasetSettingsMaxErrors')).toBeNull();
    expect(queryByTestId('createDatasetSettingsMaxErrorRatio')).toBeNull();
    expect(queryByTestId('createDatasetParquetAdvancedSettings')).toBeNull();
  });

  it('shows only shared advanced settings when parquet is selected', () => {
    const { getByTestId, queryByTestId } = renderAdditionalSettings('parquet');

    expect(queryByTestId('createDatasetWizardCommonSettings')).toBeNull();
    expect(queryByTestId('createDatasetSharedCommonSettings')).toBeNull();
    expect(queryByTestId('createDatasetParquetCommonSettings')).toBeNull();

    expect(getByTestId('createDatasetWizardAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSharedAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsErrorMode')).toBeInTheDocument();
    expect(queryByTestId('createDatasetParquetAdvancedSettings')).toBeNull();
  });

  it.each<DatasetErrorModeFormValue>(['skip_row', 'null_field'])(
    'shows max errors and max error ratio when the error mode is %s',
    (errorMode) => {
      const { getByTestId } = renderAdditionalSettings('', errorMode);

      expect(getByTestId('createDatasetSettingsMaxErrors')).toBeInTheDocument();
      expect(getByTestId('createDatasetSettingsMaxErrorRatio')).toBeInTheDocument();
    }
  );

  it('hides max errors and max error ratio when the error mode is fail_fast', () => {
    const { queryByTestId } = renderAdditionalSettings('', 'fail_fast');

    expect(queryByTestId('createDatasetSettingsMaxErrors')).toBeNull();
    expect(queryByTestId('createDatasetSettingsMaxErrorRatio')).toBeNull();
  });

  it('shows csv/tsv common and advanced settings when csv is selected', () => {
    const { getByTestId, queryByTestId } = renderAdditionalSettings('csv');

    expect(getByTestId('createDatasetSharedCommonSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetCsvTsvCommonSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsDelimiter')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsMode')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsHeaderRow')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsSkipRows')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsDatetimeFormat')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsNullValue')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsEncoding')).toBeInTheDocument();
    expect(queryByTestId('createDatasetParquetCommonSettings')).toBeNull();

    expect(getByTestId('createDatasetCsvTsvAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSharedAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsErrorMode')).toBeInTheDocument();
    const trimSpacesField = getByTestId('createDatasetSettingsTrimSpaces');
    expect(trimSpacesField).toBeInTheDocument();
    const trimSpacesRow = trimSpacesField.closest('.euiFormRow');
    expect(trimSpacesRow).not.toBeNull();
    expect(trimSpacesRow).toHaveTextContent('false by default');
    // `Trim spaces` defaults to false, represented by an empty selection (placeholder shown).
    expect(
      within(trimSpacesField).getByPlaceholderText(
        createDatasetWizardStrings.settingsTrimSpacesPlaceholder
      )
    ).toBeInTheDocument();
    const quoteField = getByTestId('createDatasetSettingsQuote') as HTMLInputElement;
    expect(quoteField).toHaveValue('');
    expect(quoteField).toHaveAttribute(
      'placeholder',
      createDatasetWizardStrings.settingsQuotePlaceholder
    );
    const quoteRow = quoteField.closest('.euiFormRow');
    expect(quoteRow).not.toBeNull();
    expect(within(quoteRow as HTMLElement).getByText('"')).toBeInTheDocument();
    expect(quoteRow).toHaveTextContent('" by default');
    const columnPrefixField = getByTestId('createDatasetSettingsColumnPrefix') as HTMLInputElement;
    expect(columnPrefixField).toHaveValue('');
    expect(columnPrefixField).toHaveAttribute(
      'placeholder',
      createDatasetWizardStrings.settingsColumnPrefixPlaceholder
    );
    const columnPrefixRow = columnPrefixField.closest('.euiFormRow');
    expect(columnPrefixRow).not.toBeNull();
    expect(columnPrefixRow).toHaveTextContent('col by default');
    const escapeField = getByTestId('createDatasetSettingsEscape') as HTMLInputElement;
    expect(escapeField).toHaveValue('');
    expect(escapeField).toHaveAttribute(
      'placeholder',
      createDatasetWizardStrings.settingsEscapePlaceholder
    );
    const escapeRow = escapeField.closest('.euiFormRow');
    expect(escapeRow).not.toBeNull();
    expect(within(escapeRow as HTMLElement).getByText('\\')).toBeInTheDocument();
    expect(escapeRow).toHaveTextContent('\\ by default');
    // API-only / passthrough-only fields are never shown in the UI
    expect(queryByTestId('createDatasetSettingsSchemaSampleSize')).toBeNull();
    expect(queryByTestId('createDatasetSettingsComment')).toBeNull();
    expect(queryByTestId('createDatasetSettingsMultiValueSyntax')).toBeNull();
    expect(queryByTestId('createDatasetSettingsMaxFieldSize')).toBeNull();
    expect(queryByTestId('createDatasetParquetAdvancedSettings')).toBeNull();
  });

  it('shows csv/tsv common and advanced settings when tsv is selected', () => {
    const { getByTestId } = renderAdditionalSettings('tsv');
    expect(getByTestId('createDatasetCsvTsvCommonSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetCsvTsvAdvancedSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsNullValue')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsSkipRows')).toBeInTheDocument();

    const quoteField = getByTestId('createDatasetSettingsQuote') as HTMLInputElement;
    const quoteRow = quoteField.closest('.euiFormRow');
    expect(quoteRow).not.toBeNull();
    expect(quoteRow).toHaveTextContent('empty by default');

    const escapeField = getByTestId('createDatasetSettingsEscape') as HTMLInputElement;
    const escapeRow = escapeField.closest('.euiFormRow');
    expect(escapeRow).not.toBeNull();
    expect(escapeRow).toHaveTextContent('empty by default');
  });

  it('shows ndjson common settings and no ndjson advanced settings when ndjson is selected', () => {
    const { getByTestId, queryByTestId } = renderAdditionalSettings('ndjson');
    expect(getByTestId('createDatasetNdjsonCommonSettings')).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsDatetimeFormat')).toBeInTheDocument();
    expect(queryByTestId('createDatasetNdjsonAdvancedSettings')).toBeNull();
    expect(queryByTestId('createDatasetSettingsSchemaSampleSize')).toBeNull();
  });

  it('shows partition path only when partition detection is template', async () => {
    const { getByTestId, queryByTestId } = renderAdditionalSettings();
    const combo = getByTestId('createDatasetSettingsPartitionDetection');

    expect(queryByTestId('createDatasetSettingsPartitionPath')).toBeNull();

    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsPartitionDetectionOption-template'));
    });

    expect(getByTestId('createDatasetSettingsPartitionPath')).toBeInTheDocument();
  });

  it('shows a required error when partition path is empty and template is selected', async () => {
    const Wrapper = () => {
      const methods = useForm<CreateDatasetFormValues>({
        defaultValues: {
          name: '',
          description: '',
          data_source: '',
          resource: '',
          settings: emptyCreateDatasetSettingsFormValues(),
          ui: {
            formatWasAutoDetected: false,
            additionalCommonSettingsIsOpen: true,
            additionalAdvancedSettingsIsOpen: false,
          },
        },
      });

      return (
        <I18nProvider>
          <EuiProvider>
            <KibanaContextProvider services={{ docLinks: docLinksMock }}>
              <FormProvider {...methods}>
                <button
                  type="button"
                  data-test-subj="validateSettings"
                  onClick={() => methods.trigger('settings.partition_path')}
                >
                  Validate
                </button>
                <CreateDatasetAdditionalSettings control={methods.control} />
              </FormProvider>
            </KibanaContextProvider>
          </EuiProvider>
        </I18nProvider>
      );
    };

    const { getByTestId, findByText } = render(<Wrapper />);
    const combo = getByTestId('createDatasetSettingsPartitionDetection');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });
    await act(async () => {
      fireEvent.click(getByTestId('createDatasetSettingsPartitionDetectionOption-template'));
    });
    await act(async () => {
      fireEvent.click(getByTestId('validateSettings'));
    });

    expect(
      await findByText(createDatasetWizardStrings.settingsPartitionPathRequired)
    ).toBeInTheDocument();
    expect(getByTestId('createDatasetSettingsPartitionPath')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('shows a description for each error mode option', async () => {
    const { getByTestId } = renderAdditionalSettings();
    const combo = getByTestId('createDatasetSettingsErrorMode');
    await act(async () => {
      fireEvent.click(combo.querySelector('input') ?? combo);
    });

    const failFast = getByTestId('createDatasetSettingsErrorModeOption-fail_fast');
    expect(failFast).toHaveTextContent(
      createDatasetWizardStrings.settingsErrorModeFailFastDescription
    );
    expect(
      within(failFast).getAllByText(createDatasetWizardStrings.defaultBadgeLabel)
    ).toHaveLength(1);
    expect(getByTestId('createDatasetSettingsErrorModeOption-skip_row')).toHaveTextContent(
      createDatasetWizardStrings.settingsErrorModeSkipRowDescription
    );
    expect(getByTestId('createDatasetSettingsErrorModeOption-null_field')).toHaveTextContent(
      createDatasetWizardStrings.settingsErrorModeNullFieldDescription
    );
  });

  it('shows an error message when skip rows is not a whole number from 0 through 1000', () => {
    const { getByTestId, getByText } = renderAdditionalSettings('csv');

    fireEvent.change(getByTestId('createDatasetSettingsSkipRows'), {
      target: { value: '1001' },
    });

    expect(getByTestId('createDatasetSettingsSkipRows')).toHaveAttribute('aria-invalid', 'true');
    expect(getByText(createDatasetWizardStrings.settingsSkipRowsInvalid)).toBeInTheDocument();
  });

  it('shows an error message when max errors is not a whole number', () => {
    const { getByTestId, getByText } = renderAdditionalSettings('', 'skip_row');

    fireEvent.change(getByTestId('createDatasetSettingsMaxErrors'), {
      target: { value: '1.5' },
    });

    expect(getByTestId('createDatasetSettingsMaxErrors')).toHaveAttribute('aria-invalid', 'true');
    expect(getByText(createDatasetWizardStrings.settingsMaxErrorsInvalid)).toBeInTheDocument();
  });

  it('shows an error message when max error ratio is out of range', () => {
    const { getByTestId, getByText } = renderAdditionalSettings('', 'skip_row');

    fireEvent.change(getByTestId('createDatasetSettingsMaxErrorRatio'), {
      target: { value: '2' },
    });

    expect(getByTestId('createDatasetSettingsMaxErrorRatio')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(getByText('Must be a number between 0 and 1.')).toBeInTheDocument();
  });

  // ORC is intentionally disabled in the format selection UI.
});
