/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFilePicker,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS } from '@kbn/evals-common';
import { useDatasets } from '../../hooks/use_evals_api';

interface ParsedExample {
  input: Record<string, unknown>;
  output?: unknown;
  metadata?: Record<string, unknown>;
}

interface ImportWizardProps {
  onClose: () => void;
}

const IMPORT_LABELS = {
  title: i18n.translate('xpack.evals.datasets.import.title', {
    defaultMessage: 'Import examples',
  }),
  stepUpload: i18n.translate('xpack.evals.datasets.import.stepUpload', {
    defaultMessage: 'Upload',
  }),
  stepPreview: i18n.translate('xpack.evals.datasets.import.stepPreview', {
    defaultMessage: 'Preview',
  }),
  stepConfirm: i18n.translate('xpack.evals.datasets.import.stepConfirm', {
    defaultMessage: 'Confirm',
  }),
  filePickerLabel: i18n.translate('xpack.evals.datasets.import.fileLabel', {
    defaultMessage: 'Select CSV or JSON file',
  }),
  jsonPasteLabel: i18n.translate('xpack.evals.datasets.import.jsonPaste', {
    defaultMessage: 'Or paste JSON directly',
  }),
  jsonPasteHelp: i18n.translate('xpack.evals.datasets.import.jsonPasteHelp', {
    defaultMessage: 'Array of objects with input, output, metadata fields',
  }),
  datasetLabel: i18n.translate('xpack.evals.datasets.import.datasetLabel', {
    defaultMessage: 'Target dataset',
  }),
  previewTitle: i18n.translate('xpack.evals.datasets.import.previewTitle', {
    defaultMessage: 'Preview (first 5 examples)',
  }),
  csvInputCol: i18n.translate('xpack.evals.datasets.import.csvInputCol', {
    defaultMessage: 'Input column',
  }),
  csvOutputCol: i18n.translate('xpack.evals.datasets.import.csvOutputCol', {
    defaultMessage: 'Output column',
  }),
  importButton: i18n.translate('xpack.evals.datasets.import.importButton', {
    defaultMessage: 'Import',
  }),
  cancelButton: i18n.translate('xpack.evals.datasets.import.cancelButton', {
    defaultMessage: 'Cancel',
  }),
  nextButton: i18n.translate('xpack.evals.datasets.import.nextButton', {
    defaultMessage: 'Next',
  }),
  backButton: i18n.translate('xpack.evals.datasets.import.backButton', {
    defaultMessage: 'Back',
  }),
  successMessage: i18n.translate('xpack.evals.datasets.import.success', {
    defaultMessage: 'Examples imported successfully',
  }),
  parseError: i18n.translate('xpack.evals.datasets.import.parseError', {
    defaultMessage: 'Failed to parse file. Ensure it is valid JSON or CSV.',
  }),
  exampleCount: (count: number) =>
    i18n.translate('xpack.evals.datasets.import.exampleCount', {
      defaultMessage: '{count} examples ready to import',
      values: { count },
    }),
};

/**
 * RFC 4180-compliant CSV line parser.
 * Handles quoted fields containing commas and escaped quotes ("").
 */
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (line[i] === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += line[i];
    }
  }
  result.push(current.trim());
  return result;
};

const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCSVLine(lines[0]);
  const rows = lines
    .slice(1)
    .filter((l) => l.trim())
    .map(parseCSVLine);
  return { headers, rows };
};

export const ImportWizard: React.FC<ImportWizardProps> = ({ onClose }) => {
  const { services } = useKibana();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [jsonText, setJsonText] = useState('');
  const [parsedExamples, setParsedExamples] = useState<ParsedExample[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [selectedDatasetId, setSelectedDatasetId] = useState('');

  // CSV mapping
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [inputCol, setInputCol] = useState('');
  const [outputCol, setOutputCol] = useState('');
  const [isCSV, setIsCSV] = useState(false);

  const { data: datasets } = useDatasets({ page: 1, perPage: 100 });

  const importMutation = useMutation({
    mutationFn: async (body: { datasetId: string; examples: ParsedExample[] }) => {
      return services.http!.post(`/internal/evals/datasets/${body.datasetId}/import`, {
        body: JSON.stringify({ examples: body.examples }),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      onClose();
    },
  });

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (file.name.endsWith('.csv')) {
        setIsCSV(true);
        const { headers, rows } = parseCSV(text);
        setCsvHeaders(headers);
        setCsvRows(rows);
        if (headers.length > 0) setInputCol(headers[0]);
        if (headers.length > 1) setOutputCol(headers[1]);
        setParseError(null);
      } else {
        setIsCSV(false);
        setJsonText(text);
        tryParseJson(text);
      }
    };
    reader.readAsText(file);
  }, []);

  const tryParseJson = (text: string): boolean => {
    try {
      const parsed = JSON.parse(text);
      const examples = Array.isArray(parsed) ? parsed : [parsed];
      setParsedExamples(
        examples.map((ex) => ({
          input: ex.input ?? { text: JSON.stringify(ex) },
          output: ex.output,
          metadata: ex.metadata,
        }))
      );
      setParseError(null);
      return true;
    } catch {
      setParseError(IMPORT_LABELS.parseError);
      setParsedExamples([]);
      return false;
    }
  };

  const buildCsvExamples = (): ParsedExample[] => {
    return csvRows.map((row) => {
      const inputIdx = csvHeaders.indexOf(inputCol);
      const outputIdx = csvHeaders.indexOf(outputCol);
      return {
        input: { text: inputIdx >= 0 ? row[inputIdx] : '' },
        output: outputIdx >= 0 ? row[outputIdx] : undefined,
      };
    });
  };

  const goToPreview = () => {
    if (isCSV) {
      const examples = buildCsvExamples();
      if (examples.length === 0) return; // Don't advance with empty CSV
      setParsedExamples(examples);
    } else if (jsonText && parsedExamples.length === 0) {
      const success = tryParseJson(jsonText);
      if (!success) return; // Don't advance on parse error
    }
    setStep(1);
  };

  const previewColumns: Array<EuiBasicTableColumn<ParsedExample>> = [
    { field: 'input', name: 'Input', render: (v: unknown) => JSON.stringify(v).slice(0, 80) },
    {
      field: 'output',
      name: 'Output',
      render: (v: unknown) => (v != null ? JSON.stringify(v).slice(0, 80) : '—'),
    },
  ];

  const steps = [
    {
      title: IMPORT_LABELS.stepUpload,
      status: (step === 0 ? 'current' : 'complete') as 'current' | 'complete',
      onClick: () => setStep(0),
    },
    {
      title: IMPORT_LABELS.stepPreview,
      status: (step === 1 ? 'current' : step > 1 ? 'complete' : 'incomplete') as
        | 'current'
        | 'complete'
        | 'incomplete',
      onClick: () => parsedExamples.length > 0 && setStep(1),
    },
    {
      title: IMPORT_LABELS.stepConfirm,
      status: (step === 2 ? 'current' : 'incomplete') as 'current' | 'incomplete',
      onClick: () => parsedExamples.length > 0 && selectedDatasetId && setStep(2),
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="l">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{IMPORT_LABELS.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiStepsHorizontal steps={steps} />
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {step === 0 && (
          <>
            <EuiFormRow label={IMPORT_LABELS.filePickerLabel}>
              <EuiFilePicker
                accept=".csv,.json"
                onChange={handleFileUpload}
                display="large"
                fullWidth
              />
            </EuiFormRow>

            {isCSV && csvHeaders.length > 0 && (
              <>
                <EuiSpacer size="m" />
                <EuiFlexGroup>
                  <EuiFlexItem>
                    <EuiFormRow label={IMPORT_LABELS.csvInputCol}>
                      <EuiSelect
                        options={csvHeaders.map((h) => ({ value: h, text: h }))}
                        value={inputCol}
                        onChange={(e) => setInputCol(e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiFormRow label={IMPORT_LABELS.csvOutputCol}>
                      <EuiSelect
                        options={[
                          { value: '', text: '— none —' },
                          ...csvHeaders.map((h) => ({ value: h, text: h })),
                        ]}
                        value={outputCol}
                        onChange={(e) => setOutputCol(e.target.value)}
                      />
                    </EuiFormRow>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            )}

            <EuiSpacer size="l" />
            <EuiFormRow label={IMPORT_LABELS.jsonPasteLabel} helpText={IMPORT_LABELS.jsonPasteHelp}>
              <EuiTextArea
                fullWidth
                rows={8}
                value={jsonText}
                onChange={(e) => {
                  setJsonText(e.target.value);
                  setIsCSV(false);
                  if (e.target.value.trim()) tryParseJson(e.target.value);
                }}
                css={{ fontFamily: 'monospace' }}
                placeholder='[{"input": {"text": "..."}, "output": "..."}]'
              />
            </EuiFormRow>

            {parseError && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut color="danger" title={parseError} iconType="alert" size="s" />
              </>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <EuiTitle size="xs">
              <h3>{IMPORT_LABELS.previewTitle}</h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiBasicTable<ParsedExample>
              items={parsedExamples.slice(0, 5)}
              columns={previewColumns}
            />
            <EuiSpacer size="m" />
            <EuiText size="s">{IMPORT_LABELS.exampleCount(parsedExamples.length)}</EuiText>
          </>
        )}

        {step === 2 && (
          <>
            <EuiFormRow label={IMPORT_LABELS.datasetLabel}>
              <EuiSelect
                options={
                  datasets?.datasets.map((d: { id: string; name: string }) => ({
                    value: d.id,
                    text: d.name,
                  })) ?? []
                }
                value={selectedDatasetId}
                onChange={(e) => setSelectedDatasetId(e.target.value)}
              />
            </EuiFormRow>
            <EuiSpacer size="m" />
            <EuiText size="s">{IMPORT_LABELS.exampleCount(parsedExamples.length)}</EuiText>

            {importMutation.isError && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut
                  color="danger"
                  title={
                    importMutation.error instanceof Error
                      ? importMutation.error.message
                      : 'Import failed'
                  }
                  iconType="alert"
                  size="s"
                />
              </>
            )}
          </>
        )}
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {step > 0 ? (
              <EuiButtonEmpty onClick={() => setStep(step - 1)}>
                {IMPORT_LABELS.backButton}
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty onClick={onClose}>{IMPORT_LABELS.cancelButton}</EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {step < 2 ? (
              <EuiButton
                onClick={goToPreview}
                disabled={parsedExamples.length === 0 && !isCSV}
                fill
              >
                {IMPORT_LABELS.nextButton}
              </EuiButton>
            ) : (
              <EuiButton
                onClick={() =>
                  importMutation.mutate({
                    datasetId: selectedDatasetId,
                    examples: parsedExamples,
                  })
                }
                disabled={!selectedDatasetId || parsedExamples.length === 0}
                isLoading={importMutation.isLoading}
                fill
              >
                {IMPORT_LABELS.importButton}
              </EuiButton>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
