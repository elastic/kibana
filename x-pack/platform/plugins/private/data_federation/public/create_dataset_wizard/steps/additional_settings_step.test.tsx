/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import React, { useRef } from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useForm } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../dataset_wizard_form_state';
import { emptyDatasetWizardFormValues } from '../dataset_wizard_form_state';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  DATASET_WIZARD_FLOW_VARIANT_2,
  DATASET_WIZARD_FLOW_VARIANT_3,
  DATASET_WIZARD_FLOW_VARIANT_3_9_6,
  DATASET_WIZARD_FLOW_VARIANT_4,
  type DatasetWizardFlowVariant,
} from '../dataset_wizard_flow_variant';
import { NULL_VALUE_EMPTY_STRING_PRESET } from '../../create_dataset_flyout/dataset_settings_options';
import {
  DATASET_SETTING_DESCRIPTION_TEST_SUBJ,
  DATASET_SETTING_DESCRIPTION_TIP_TEST_SUBJ,
} from '../../create_dataset_flyout/dataset_settings_default_hints';
import { AdditionalSettingsStep } from './additional_settings_step';

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({
    value,
    onChange,
    'data-test-subj': dataTestSubj,
  }: {
    value: string;
    onChange: (value: string) => void;
    'data-test-subj'?: string;
  }) => (
    <textarea
      data-test-subj={dataTestSubj}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

/** Mirrors the app, which renders inside Kibana's i18n and EUI contexts. */
const TestProviders: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <EuiProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiProvider>
);

const TestHarness = ({
  resource,
  isEditMode = false,
  flowVariant = DATASET_WIZARD_FLOW_VARIANT_2,
  autoDetectedRegion = '',
}: {
  resource: string;
  isEditMode?: boolean;
  flowVariant?: DatasetWizardFlowVariant;
  autoDetectedRegion?: string;
}) => {
  const syncedResourceRef = useRef<string | null>(null);
  const { control, getValues, setValue } = useForm<DatasetWizardFormValues>({
    defaultValues: emptyDatasetWizardFormValues(),
  });

  return (
    <TestProviders>
      <AdditionalSettingsStep
        control={control}
        getValues={getValues}
        setValue={setValue}
        resource={resource}
        syncedResourceRef={syncedResourceRef}
        isEditMode={isEditMode}
        flowVariant={flowVariant}
        autoDetectedRegion={autoDetectedRegion}
      />
    </TestProviders>
  );
};

const getHelpTexts = (fieldElement: HTMLElement): HTMLElement[] => {
  const helpTexts = fieldElement.closest('.euiFormRow')?.querySelectorAll('.euiFormHelpText');

  if (!helpTexts?.length) {
    throw new Error('Expected the field to have help text');
  }

  return Array.from(helpTexts) as HTMLElement[];
};

/** Where defaults are shown, the description is only there for screen readers. */
const getVisibleHelpText = (fieldElement: HTMLElement): HTMLElement => {
  const helpTexts = getHelpTexts(fieldElement).filter(
    (helpText) =>
      !helpText.querySelector(`[data-test-subj="${DATASET_SETTING_DESCRIPTION_TEST_SUBJ}"]`)
  );

  if (helpTexts.length !== 1) {
    throw new Error(`Expected one visible help text, found ${helpTexts.length}`);
  }

  return helpTexts[0];
};

describe('AdditionalSettingsStep', () => {
  it('shows region before format only in flow 3', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_2} />
    );

    expect(queryByTestId('datasetWizardRegion')).toBeNull();
    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();

    rerender(
      <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
    );

    const region = getByTestId('datasetWizardRegion');
    const format = getByTestId('datasetWizardSettingsFormat');
    expect(region.compareDocumentPosition(format) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(getByTestId('datasetWizardAdditionalSettingsStep')).toHaveTextContent(
      'Additional settings'
    );
    expect(getByTestId('datasetWizardAdditionalSettingsStep')).not.toHaveTextContent(
      'Additional settings (optional)'
    );
  });

  it('shows a data source setup warning in flow 3 when region and format cannot be auto-detected', async () => {
    const { findByTestId } = render(
      <TestHarness resource="s3://bucket/path/data" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
    );

    expect(await findByTestId('datasetWizardDataSourceSetupWarning')).toBeInTheDocument();
  });

  it('does not show the data source setup warning in flow 3 when format is auto-detected', async () => {
    const { queryByTestId } = render(
      <TestHarness
        resource="s3://bucket/path/data.csv"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3}
      />
    );

    await waitFor(() => {
      expect(queryByTestId('datasetWizardDataSourceSetupWarning')).toBeNull();
    });
  });

  it('does not show the data source setup warning outside flow 3', () => {
    const { queryByTestId } = render(
      <TestHarness resource="s3://bucket/path/data" flowVariant={DATASET_WIZARD_FLOW_VARIANT_2} />
    );

    expect(queryByTestId('datasetWizardDataSourceSetupWarning')).toBeNull();
  });

  it('shows a data source setup warning in flow 4 when region and format cannot be auto-detected', async () => {
    const { findByTestId } = render(
      <TestHarness resource="s3://bucket/path/data" flowVariant={DATASET_WIZARD_FLOW_VARIANT_4} />
    );

    expect(await findByTestId('datasetWizardDataSourceSetupWarning')).toBeInTheDocument();
  });

  it('does not show the data source setup warning in flow 3 9.6', () => {
    const { queryByTestId } = render(
      <TestHarness
        resource="s3://bucket/path/data"
        flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
      />
    );

    expect(queryByTestId('datasetWizardDataSourceSetupWarning')).toBeNull();
  });

  it('renders format field and accordions when format is auto-detected', async () => {
    const { getByTestId, getByText } = render(<TestHarness resource="s3://bucket/data.csv" />);

    expect(getByText('Additional settings (optional)')).toBeInTheDocument();
    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();

    await waitFor(() => {
      expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      expect(getByTestId('datasetWizardAccordionTextParsing')).toBeInTheDocument();
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
    });
  });

  it('leaves format empty and hides accordions when extension is not recognized', () => {
    const { getByTestId, queryByTestId } = render(<TestHarness resource="s3://bucket/data.json" />);

    expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
    expect(queryByTestId('datasetWizardAccordionStructureAndSchema')).toBeNull();
  });

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills csv defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.csv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'csv',
          delimiter: ',',
          mode: 'quoted',
          header_row: 'true',
          null_value: NULL_VALUE_EMPTY_STRING_PRESET,
          encoding: 'UTF-8',
          quote: '"',
          escape: '\\',
          comment: '//',
          column_prefix: 'col',
          schema_sample_size: '20000',
          datetime_format: 'ISO-8601',
          multi_value_syntax: 'none',
          max_field_size: '10485760',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills tsv defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.tsv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'tsv',
          delimiter: '\t',
          mode: 'plain',
          header_row: 'true',
          null_value: NULL_VALUE_EMPTY_STRING_PRESET,
          encoding: 'UTF-8',
          quote: 'none',
          escape: 'none',
          comment: '//',
          column_prefix: 'col',
          schema_sample_size: '20000',
          datetime_format: 'ISO-8601',
          multi_value_syntax: 'none',
          max_field_size: '10485760',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for parquet format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.parquet" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
      expect(getByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeInTheDocument();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for ndjson format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.ndjson" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(getByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeInTheDocument();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'shows error handling for orc format in %s',
    async (flowVariant) => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.orc" flowVariant={flowVariant} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardAccordionStructureAndSchema')).toBeInTheDocument();
      });

      expect(getByTestId('datasetWizardAccordionErrorHandling')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
      expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
      expect(queryByTestId('datasetWizardAccordionLimitsAndPerformance')).toBeNull();
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills orc defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.orc"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'orc',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
          partition_path: '',
          max_errors: '',
        });
      });
    }
  );

  it.each([DATASET_WIZARD_FLOW_VARIANT_1, DATASET_WIZARD_FLOW_VARIANT_2])(
    'prefills ndjson defaults when format is auto-detected in %s',
    async (flowVariant) => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.ndjson"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={flowVariant}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'ndjson',
          schema_sample_size: '20000',
          datetime_format: 'strict_date_optional_time',
          partition_detection: 'auto',
          schema_resolution: 'union_by_name',
          error_mode: 'fail_fast',
          max_error_ratio: '0.0',
          segment_size: '4mb',
        });
      });
    }
  );

  it('shows datetime format in common settings for ndjson without columns accordion', async () => {
    const { getByTestId, queryByTestId } = render(
      <TestHarness resource="s3://bucket/data.ndjson" />
    );

    await waitFor(() => {
      expect(getByTestId('datasetWizardCommonSettingsPanel')).toBeInTheDocument();
      expect(getByTestId('datasetWizardSettingsDatetimeFormat')).toBeInTheDocument();
    });

    expect(queryByTestId('datasetWizardSettingsDelimiter')).toBeNull();
    expect(queryByTestId('datasetWizardAccordionColumnsAndValues')).toBeNull();
  });

  describe('flow 3 9.6', () => {
    it('hides the region field', async () => {
      const { queryByTestId, getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsFormat')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardRegion')).toBeNull();
    });

    it('leaves settings unset so the request can omit them', async () => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.csv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'csv',
          delimiter: '',
          partition_detection: '',
          encoding: '',
          error_mode: '',
        });
      });
    });

    it('names the default in the help text, as the literal Elasticsearch receives', async () => {
      const { getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
      });

      const delimiterHelp = getVisibleHelpText(getByTestId('datasetWizardSettingsDelimiter'));
      expect(delimiterHelp.textContent).toBe(', by default.');
      expect(delimiterHelp.querySelector('code')?.textContent).toBe(',');

      // The stored value is a byte count, which is not what the help text quotes.
      const maxFieldSizeHelp = getVisibleHelpText(getByTestId('datasetWizardSettingsMaxFieldSize'));
      expect(maxFieldSizeHelp.querySelector('code')?.textContent).toBe('10mb');

      // An empty default has no literal worth quoting.
      const nullValueHelp = getVisibleHelpText(getByTestId('datasetWizardSettingsNullValue'));
      expect(nullValueHelp.textContent).toBe('An empty string by default.');
      expect(nullValueHelp.querySelector('code')).toBeNull();
    });

    it('moves the description into a tooltip on the label, and keeps it for screen readers', async () => {
      const { getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
      });

      const delimiterRow = getByTestId('datasetWizardSettingsDelimiter').closest(
        '.euiFormRow'
      ) as HTMLElement;
      const description =
        'The character that separates fields. If your delimiter is not available, create a custom one.';

      fireEvent.mouseOver(
        within(delimiterRow).getByTestId(DATASET_SETTING_DESCRIPTION_TIP_TEST_SUBJ)
      );

      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toHaveTextContent(description);
      });

      expect(
        within(delimiterRow).getByTestId(DATASET_SETTING_DESCRIPTION_TEST_SUBJ)
      ).toHaveTextContent(description);
    });

    it('keeps the plain select placeholders', async () => {
      const { getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
      });

      expect(
        within(getByTestId('datasetWizardSettingsDelimiter')).getByRole('combobox')
      ).toHaveAttribute('placeholder', 'Select delimiter');
      expect(
        within(getByTestId('datasetWizardSettingsMode')).getByRole('combobox')
      ).toHaveAttribute('placeholder', 'Select quote mode');
    });

    it('lets a dropdown be cleared back to its default through the combo box', async () => {
      const { getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsMode')).toBeInTheDocument();
      });

      const modeField = within(getByTestId('datasetWizardSettingsMode'));
      fireEvent.click(modeField.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
      });

      const defaultOption = screen.getByRole('option', { name: /Quoted/ });
      expect(
        within(defaultOption).getByTestId('datasetSettingsDefaultOptionBadge')
      ).toBeInTheDocument();

      fireEvent.click(defaultOption);

      await waitFor(() => {
        expect(modeField.getByTestId('comboBoxClearButton')).toBeInTheDocument();
      });

      fireEvent.click(modeField.getByTestId('comboBoxClearButton'));

      await waitFor(() => {
        expect(modeField.queryByTestId('comboBoxClearButton')).toBeNull();
      });

      expect(modeField.getByRole('combobox')).toHaveAttribute('placeholder', 'Select quote mode');
    });

    it('keeps the super select in flow 3, which has no default to clear back to', async () => {
      const { getByTestId } = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsMode')).toBeInTheDocument();
      });

      const modeField = getByTestId('datasetWizardSettingsMode');
      expect(modeField.tagName).toBe('BUTTON');
      expect(
        within(modeField.closest('.euiFormRow') as HTMLElement).queryByRole('combobox')
      ).toBeNull();
    });

    it('says nothing about defaults in flow 3, where they are already filled in', async () => {
      const { getByTestId } = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsDelimiter')).toBeInTheDocument();
      });

      const delimiterHelp = getVisibleHelpText(getByTestId('datasetWizardSettingsDelimiter'));
      expect(delimiterHelp.textContent).toBe(
        'The character that separates fields. If your delimiter is not available, create a custom one.'
      );
      expect(delimiterHelp.querySelector('code')).toBeNull();
    });

    it('drops the filled settings panels that flow 3 keeps', async () => {
      const render96 = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(render96.getByTestId('datasetWizardFlow3CommonSettingsPanel')).toBeInTheDocument();
      });

      ['datasetWizardFlow3CommonSettingsPanel', 'datasetWizardFlow3AdvancedSettingsPanel'].forEach(
        (testSubj) => {
          expect(render96.getByTestId(testSubj)).not.toHaveClass('euiPanel--subdued');
        }
      );

      render96.unmount();

      const renderFlow3 = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        expect(renderFlow3.getByTestId('datasetWizardFlow3CommonSettingsPanel')).toHaveClass(
          'euiPanel--subdued'
        );
      });
    });

    it('indents the settings fields without pushing them past the format field', async () => {
      const { getByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.csv"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardFlow3CommonSettingsFields')).toBeInTheDocument();
      });

      [
        'datasetWizardFlow3CommonSettingsFields',
        'datasetWizardFlow3AdvancedSettingsFields',
      ].forEach((testSubj) => {
        const { width, marginInlineStart } = getComputedStyle(getByTestId(testSubj));

        expect(marginInlineStart).toBe('calc(24px + 4px)');
        expect(width).toBe('calc(80% - 24px - 4px)');
      });
    });

    it('leaves the partition settings to the resource step in flow 3 9.6', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness
          resource="s3://bucket/data.parquet"
          flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
        />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardFlow3CommonSettingsFields')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardSettingsPartitionDetection')).toBeNull();
      expect(queryByTestId('datasetWizardSettingsPartitionPath')).toBeNull();
    });

    it('keeps the partition settings the resource step collected', async () => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: {
            ...emptyDatasetWizardFormValues(),
            settings: {
              ...emptyDatasetWizardFormValues().settings,
              partition_detection: 'hive',
              partition_path: 'year/month',
            },
          },
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.parquet"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={DATASET_WIZARD_FLOW_VARIANT_3_9_6}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({
          format: 'parquet',
          partition_detection: 'hive',
          partition_path: 'year/month',
        });
      });
    });

    it('keeps pre-filling defaults in flow 3', async () => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue, watch } = useForm<DatasetWizardFormValues>({
          defaultValues: emptyDatasetWizardFormValues(),
        });
        const settings = watch('settings');

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.csv"
              syncedResourceRef={syncedResourceRef}
              isEditMode={false}
              flowVariant={DATASET_WIZARD_FLOW_VARIANT_3}
            />
            <div data-test-subj="settingsSnapshot">{JSON.stringify(settings)}</div>
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        const settings = JSON.parse(getByTestId('settingsSnapshot').textContent ?? '{}');
        expect(settings).toMatchObject({ format: 'csv', delimiter: ',' });
      });
    });
  });

  describe('flow 3 settings layout', () => {
    it('uses common panel and single advanced accordion instead of grouped accordions', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardFlow3CommonSettingsPanel')).toBeInTheDocument();
        expect(getByTestId('datasetWizardFlow3AdvancedSettingsAccordion')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardCommonSettingsPanel')).toBeNull();
      expect(queryByTestId('datasetWizardAccordionStructureAndSchema')).toBeNull();
      expect(queryByTestId('datasetWizardAccordionTextParsing')).toBeNull();
    });

    it('shows expanded csv common fields in flow 3', async () => {
      const { getByTestId } = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        const commonPanel = getByTestId('datasetWizardFlow3CommonSettingsPanel');
        expect(commonPanel).toContainElement(getByTestId('datasetWizardSettingsDelimiter'));
        expect(commonPanel).toContainElement(getByTestId('datasetWizardSettingsMode'));
        expect(commonPanel).toContainElement(getByTestId('datasetWizardSettingsHeaderRow'));
        expect(commonPanel).toContainElement(getByTestId('datasetWizardSettingsDatetimeFormat'));
        expect(commonPanel).toContainElement(getByTestId('datasetWizardSettingsEncoding'));
        expect(within(commonPanel).queryByTestId('datasetWizardSettingsQuote')).toBeNull();
      });
    });

    it('promotes max error fields into common settings for ndjson when error mode is not fail_fast', async () => {
      const Harness = () => {
        const syncedResourceRef = useRef<string | null>(null);
        const { control, getValues, setValue } = useForm<DatasetWizardFormValues>({
          defaultValues: {
            ...emptyDatasetWizardFormValues(),
            settings: {
              ...emptyDatasetWizardFormValues().settings,
              format: 'ndjson',
              error_mode: 'skip_row',
            },
          },
        });

        return (
          <TestProviders>
            <AdditionalSettingsStep
              control={control}
              getValues={getValues}
              setValue={setValue}
              resource="s3://bucket/data.ndjson"
              syncedResourceRef={syncedResourceRef}
              isEditMode={true}
              flowVariant={DATASET_WIZARD_FLOW_VARIANT_3}
            />
          </TestProviders>
        );
      };

      const { getByTestId } = render(<Harness />);

      await waitFor(() => {
        expect(getByTestId('datasetWizardSettingsMaxErrors')).toBeInTheDocument();
        expect(getByTestId('datasetWizardSettingsMaxErrorRatio')).toBeInTheDocument();
      });
    });
    it('shows advanced fields without a view toggle or JSON editor', async () => {
      const { getByTestId, queryByTestId } = render(
        <TestHarness resource="s3://bucket/data.csv" flowVariant={DATASET_WIZARD_FLOW_VARIANT_3} />
      );

      await waitFor(() => {
        expect(getByTestId('datasetWizardFlow3CommonSettingsPanel')).toBeInTheDocument();
        expect(getByTestId('datasetWizardFlow3AdvancedSettingsAccordion')).toBeInTheDocument();
        expect(getByTestId('datasetWizardSettingsQuote')).toBeInTheDocument();
        expect(getByTestId('datasetWizardSettingsPartitionDetection')).toBeInTheDocument();
        expect(getByTestId('datasetWizardSettingsErrorMode')).toBeInTheDocument();
      });

      expect(queryByTestId('datasetWizardAdvancedSettingsViewToggle')).toBeNull();
      expect(queryByTestId('datasetWizardSettingsCustomJsonEditor')).toBeNull();
      expect(queryByTestId('datasetWizardAccordionStructureAndSchema')).toBeNull();
    });
  });
});
