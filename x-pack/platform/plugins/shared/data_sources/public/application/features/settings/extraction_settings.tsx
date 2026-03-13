/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFormRow,
  EuiSuperSelect,
  EuiComboBox,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiHorizontalRule,
  EuiAccordion,
  EuiBadge,
  EuiCodeBlock,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useExtractionConfig,
  useInferenceEndpoints,
  useWorkflows,
  type ExtractionMethod,
  type FormatOverride,
} from '../../hooks/use_extraction_config';

const EMPTY_OVERRIDES: Record<string, FormatOverride> = {};

const KNOWN_FORMATS: Array<{ extension: string; label: string }> = [
  { extension: '.pdf', label: 'PDF (.pdf)' },
  { extension: '.docx', label: 'Word (.docx)' },
  { extension: '.doc', label: 'Word legacy (.doc)' },
  { extension: '.xlsx', label: 'Excel (.xlsx)' },
  { extension: '.xls', label: 'Excel legacy (.xls)' },
  { extension: '.pptx', label: 'PowerPoint (.pptx)' },
  { extension: '.ppt', label: 'PowerPoint legacy (.ppt)' },
  { extension: '.odt', label: 'OpenDocument Text (.odt)' },
  { extension: '.ods', label: 'OpenDocument Spreadsheet (.ods)' },
  { extension: '.odp', label: 'OpenDocument Presentation (.odp)' },
  { extension: '.rtf', label: 'Rich Text (.rtf)' },
  { extension: '.html', label: 'HTML (.html)' },
  { extension: '.txt', label: 'Plain text (.txt)' },
  { extension: '.csv', label: 'CSV (.csv)' },
  { extension: '.epub', label: 'EPUB (.epub)' },
  { extension: '.msg', label: 'Outlook (.msg)' },
  { extension: '.eml', label: 'Email (.eml)' },
  { extension: '.png', label: 'PNG image (.png)' },
  { extension: '.jpg', label: 'JPEG image (.jpg)' },
  { extension: '.tiff', label: 'TIFF image (.tiff)' },
];

const WORKFLOW_CONTRACT_TEXT = `The workflow must accept these inputs and produce the matching outputs:

Inputs:
  • content (string, required) — base64-encoded file data
  • filename (string, required) — original filename with extension
  • doc_id (string, optional) — document identifier

Outputs:
  • content (string, required) — extracted plain text
  • content_type (string, optional) — MIME type (e.g. application/pdf)`;

const METHOD_OPTIONS = [
  {
    value: 'tika' as const,
    inputDisplay: i18n.translate('xpack.dataSources.settings.extraction.method.tika', {
      defaultMessage: 'Tika (built-in)',
    }),
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.dataSources.settings.extraction.method.tika.title', {
            defaultMessage: 'Tika (built-in)',
          })}
        </strong>
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.dataSources.settings.extraction.method.tika.description', {
            defaultMessage:
              'Uses the Elasticsearch ingest attachment processor powered by Apache Tika. Supports PDFs, Word, Excel, HTML, and more. Runs entirely within your cluster.',
          })}
        </EuiText>
      </>
    ),
  },
  {
    value: 'inference' as const,
    inputDisplay: i18n.translate('xpack.dataSources.settings.extraction.method.inference', {
      defaultMessage: 'Inference endpoint',
    }),
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.dataSources.settings.extraction.method.inference.title', {
            defaultMessage: 'Inference endpoint',
          })}
        </strong>
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.dataSources.settings.extraction.method.inference.description',
            {
              defaultMessage:
                'Sends documents to an Elasticsearch inference endpoint (e.g. a vision-capable LLM). Useful for scanned PDFs, images, or documents requiring OCR.',
            }
          )}
        </EuiText>
      </>
    ),
  },
  {
    value: 'workflow' as const,
    inputDisplay: i18n.translate('xpack.dataSources.settings.extraction.method.workflow', {
      defaultMessage: 'Custom workflow',
    }),
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.dataSources.settings.extraction.method.workflow.title', {
            defaultMessage: 'Custom workflow',
          })}
        </strong>
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.dataSources.settings.extraction.method.workflow.description',
            {
              defaultMessage:
                'Delegates extraction to a user-defined workflow. The workflow must conform to the extraction contract (specific inputs and outputs).',
            }
          )}
        </EuiText>
      </>
    ),
  },
  {
    value: 'connector' as const,
    inputDisplay: i18n.translate('xpack.dataSources.settings.extraction.method.connector', {
      defaultMessage: 'Connector (coming soon)',
    }),
    disabled: true,
    dropdownDisplay: (
      <>
        <strong>
          {i18n.translate('xpack.dataSources.settings.extraction.method.connector.title', {
            defaultMessage: 'Stack connector (coming soon)',
          })}
        </strong>
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.dataSources.settings.extraction.method.connector.description',
            {
              defaultMessage:
                'Uses a stack connector that exposes an "extract" sub-action (e.g. Unstructured.io, Amazon Textract). Not yet available.',
            }
          )}
        </EuiText>
      </>
    ),
  },
];

const METHOD_SELECT_OPTIONS = [
  { value: 'tika' as const, inputDisplay: 'Tika' },
  { value: 'inference' as const, inputDisplay: 'Inference' },
  { value: 'workflow' as const, inputDisplay: 'Workflow' },
  { value: 'connector' as const, inputDisplay: 'Connector', disabled: true },
];

interface FormatOverrideRowProps {
  extension: string;
  override: FormatOverride;
  endpointOptions: Array<{ label: string }>;
  endpointsLoading: boolean;
  workflowOptions: Array<{ label: string; value: string }>;
  workflowsLoading: boolean;
  onChange: (ext: string, override: FormatOverride) => void;
  onRemove: (ext: string) => void;
}

const FormatOverrideRow: React.FC<FormatOverrideRowProps> = ({
  extension,
  override,
  endpointOptions,
  endpointsLoading,
  workflowOptions,
  workflowsLoading,
  onChange,
  onRemove,
}) => {
  const selectedEndpoint = useMemo(
    () => (override.inferenceId ? [{ label: override.inferenceId }] : []),
    [override.inferenceId]
  );

  const formatLabel =
    KNOWN_FORMATS.find((f) => f.extension === extension)?.label ?? extension;

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} style={{ width: 200 }}>
        <EuiBadge color="hollow">{formatLabel}</EuiBadge>
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ width: 160 }}>
        <EuiSuperSelect
          options={METHOD_SELECT_OPTIONS}
          valueOfSelected={override.method}
          onChange={(value) => onChange(extension, { ...override, method: value })}
          compressed
        />
      </EuiFlexItem>
      {override.method === 'inference' && (
        <EuiFlexItem grow>
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={endpointOptions}
            selectedOptions={selectedEndpoint}
            onChange={(opts) =>
              onChange(extension, { ...override, inferenceId: opts[0]?.label })
            }
            isLoading={endpointsLoading}
            compressed
            placeholder="Auto-discover"
          />
        </EuiFlexItem>
      )}
      {override.method === 'workflow' && (
        <EuiFlexItem grow>
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={workflowOptions}
            selectedOptions={
              override.workflowId ? [{ label: override.workflowId, value: override.workflowId }] : []
            }
            onCreateOption={(val) =>
              onChange(extension, { ...override, workflowId: val })
            }
            onChange={(opts) => {
              const picked = opts[0] as { label: string; value?: string } | undefined;
              onChange(extension, { ...override, workflowId: picked?.value ?? picked?.label });
            }}
            isLoading={workflowsLoading}
            compressed
            placeholder="Select or type a workflow ID"
          />
        </EuiFlexItem>
      )}
      {(override.method === 'tika' || override.method === 'connector') && (
        <EuiFlexItem grow />
      )}
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={`Remove ${extension} override`}
          onClick={() => onRemove(extension)}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ExtractionSettings: React.FC = () => {
  const { config, isLoading, isError, updateConfig, isUpdating } = useExtractionConfig();
  const { data: endpoints, isLoading: endpointsLoading } = useInferenceEndpoints();
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows();

  const [method, setMethod] = useState<ExtractionMethod>(config.method);
  const [inferenceId, setInferenceId] = useState<string | undefined>(config.inferenceId);
  const [workflowId, setWorkflowId] = useState<string | undefined>(config.workflowId);
  const [formatOverrides, setFormatOverrides] = useState<Record<string, FormatOverride>>(
    config.formatOverrides ?? EMPTY_OVERRIDES
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [advancedJson, setAdvancedJson] = useState('');
  const [advancedJsonError, setAdvancedJsonError] = useState<string | undefined>();

  useEffect(() => {
    setMethod(config.method);
    setInferenceId(config.inferenceId);
    setWorkflowId(config.workflowId);
    setFormatOverrides(config.formatOverrides ?? EMPTY_OVERRIDES);
    setHasChanges(false);
  }, [config]);

  const markDirty = useCallback(() => setHasChanges(true), []);

  const handleMethodChange = useCallback(
    (value: ExtractionMethod) => {
      setMethod(value);
      markDirty();
    },
    [markDirty]
  );

  const handleInferenceIdChange = useCallback(
    (selectedOptions: Array<{ label: string }>) => {
      setInferenceId(selectedOptions[0]?.label);
      markDirty();
    },
    [markDirty]
  );

  const handleWorkflowIdChange = useCallback(
    (value: string) => {
      setWorkflowId(value || undefined);
      markDirty();
    },
    [markDirty]
  );

  const handleFormatOverrideChange = useCallback(
    (ext: string, override: FormatOverride) => {
      setFormatOverrides((prev) => ({ ...prev, [ext]: override }));
      markDirty();
    },
    [markDirty]
  );

  const handleRemoveFormatOverride = useCallback(
    (ext: string) => {
      setFormatOverrides((prev) => {
        const next = { ...prev };
        delete next[ext];
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const availableFormats = useMemo(
    () => KNOWN_FORMATS.filter((f) => !formatOverrides[f.extension]),
    [formatOverrides]
  );

  const formatDropdownOptions = useMemo(
    () => availableFormats.map((f) => ({ label: f.label, value: f.extension })),
    [availableFormats]
  );

  const handleAddFormatFromDropdown = useCallback(
    (selectedOptions: Array<{ label: string; value?: string }>) => {
      const ext = selectedOptions[0]?.value;
      if (!ext) return;
      setFormatOverrides((prev) => ({ ...prev, [ext]: { method: 'tika' } }));
      markDirty();
    },
    [markDirty]
  );

  // Sync overrides -> advanced JSON when the accordion opens
  const handleAdvancedToggle = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setAdvancedJson(JSON.stringify(formatOverrides, null, 2));
        setAdvancedJsonError(undefined);
      }
    },
    [formatOverrides]
  );

  const handleAdvancedJsonApply = useCallback(() => {
    try {
      const parsed = JSON.parse(advancedJson);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        setAdvancedJsonError('Must be a JSON object');
        return;
      }
      const validMethods = new Set(['tika', 'inference', 'workflow', 'connector']);
      for (const [key, val] of Object.entries(parsed)) {
        if (typeof key !== 'string') {
          setAdvancedJsonError(`Key must be a string: ${key}`);
          return;
        }
        const v = val as Record<string, unknown>;
        if (!v.method || !validMethods.has(v.method as string)) {
          setAdvancedJsonError(
            `Invalid method for "${key}": must be one of tika, inference, workflow, connector`
          );
          return;
        }
      }
      setFormatOverrides(parsed as Record<string, FormatOverride>);
      setAdvancedJsonError(undefined);
      markDirty();
    } catch (e) {
      setAdvancedJsonError(`Invalid JSON: ${(e as Error).message}`);
    }
  }, [advancedJson, markDirty]);

  const handleSave = useCallback(() => {
    const overrides = Object.keys(formatOverrides).length > 0 ? formatOverrides : undefined;
    updateConfig({
      method,
      inferenceId: method === 'inference' ? inferenceId : undefined,
      workflowId: method === 'workflow' ? workflowId : undefined,
      formatOverrides: overrides,
    });
  }, [method, inferenceId, workflowId, formatOverrides, updateConfig]);

  const endpointOptions = useMemo(
    () => (endpoints ?? []).map((ep) => ({ label: ep.inference_id })),
    [endpoints]
  );

  const selectedEndpoint = useMemo(
    () => (inferenceId ? [{ label: inferenceId }] : []),
    [inferenceId]
  );

  const workflowOptions = useMemo(
    () => {
      const compatible = (workflows ?? []).filter((wf) => wf.compatible);
      const incompatible = (workflows ?? []).filter((wf) => !wf.compatible);

      const options: Array<{ label: string; value: string; color?: string }> = [];

      for (const wf of compatible) {
        options.push({ label: `${wf.name} (${wf.id})`, value: wf.id });
      }

      for (const wf of incompatible) {
        const issueText = wf.issues?.length ? `: ${wf.issues.join(', ')}` : '';
        options.push({
          label: `${wf.name} (${wf.id}) — incompatible${issueText}`,
          value: wf.id,
          color: 'subdued',
        });
      }

      return options;
    },
    [workflows]
  );

  const selectedWorkflow = useMemo(
    () => {
      if (!workflowId) return [];
      const match = workflows?.find((wf) => wf.id === workflowId);
      return [{ label: match ? `${match.name} (${match.id})` : workflowId, value: workflowId }];
    },
    [workflowId, workflows]
  );

  const overrideCount = Object.keys(formatOverrides).length;

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (isError) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.dataSources.settings.extraction.error', {
          defaultMessage: 'Failed to load extraction settings',
        })}
        color="danger"
        iconType="error"
      />
    );
  }

  return (
    <EuiPanel hasBorder>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.dataSources.settings.extraction.title', {
            defaultMessage: 'Content extraction',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.dataSources.settings.extraction.description', {
          defaultMessage:
            'Configure how text content is extracted from downloaded files (PDFs, Word docs, etc.). This setting applies as the default for all data sources. Individual workflow steps can override this.',
        })}
      </EuiText>

      <EuiHorizontalRule margin="m" />

      <EuiFormRow
        label={i18n.translate('xpack.dataSources.settings.extraction.methodLabel', {
          defaultMessage: 'Default extraction method',
        })}
        helpText={i18n.translate('xpack.dataSources.settings.extraction.methodHelp', {
          defaultMessage:
            'Choose how files are converted to text. Tika is the default and works for most file types. Use format overrides below to route specific file types differently.',
        })}
      >
        <EuiSuperSelect
          options={METHOD_OPTIONS}
          valueOfSelected={method}
          onChange={handleMethodChange}
          data-test-subj="extractionMethodSelect"
        />
      </EuiFormRow>

      {method === 'inference' && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.dataSources.settings.extraction.inferenceIdLabel', {
              defaultMessage: 'Default inference endpoint',
            })}
            helpText={i18n.translate('xpack.dataSources.settings.extraction.inferenceIdHelp', {
              defaultMessage:
                'Select a completion inference endpoint. If left empty, the system will auto-discover an available one.',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              options={endpointOptions}
              selectedOptions={selectedEndpoint}
              onChange={handleInferenceIdChange}
              isLoading={endpointsLoading}
              placeholder={i18n.translate(
                'xpack.dataSources.settings.extraction.inferenceIdPlaceholder',
                { defaultMessage: 'Auto-discover endpoint' }
              )}
              data-test-subj="extractionInferenceIdSelect"
            />
          </EuiFormRow>
        </>
      )}

      {method === 'workflow' && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.dataSources.settings.extraction.workflowIdLabel', {
              defaultMessage: 'Workflow',
            })}
            helpText={i18n.translate('xpack.dataSources.settings.extraction.workflowIdHelp', {
              defaultMessage:
                'Select a workflow or type an ID. Compatible workflows declare "content" and "filename" inputs. You can also paste an ID manually.',
            })}
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              options={workflowOptions}
              selectedOptions={selectedWorkflow}
              onCreateOption={(val) => handleWorkflowIdChange(val)}
              onChange={(opts) => {
                const picked = opts[0] as { label: string; value?: string } | undefined;
                handleWorkflowIdChange(picked?.value ?? picked?.label ?? '');
              }}
              isLoading={workflowsLoading}
              placeholder={i18n.translate(
                'xpack.dataSources.settings.extraction.workflowIdPlaceholder',
                { defaultMessage: 'Select or type a workflow ID...' }
              )}
              data-test-subj="extractionWorkflowIdSelect"
            />
          </EuiFormRow>
          <EuiSpacer size="m" />
          <EuiCallOut
            title={i18n.translate('xpack.dataSources.settings.extraction.workflowContract.title', {
              defaultMessage: 'Extraction contract',
            })}
            iconType="iInCircle"
            size="s"
          >
            <EuiText size="xs">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{WORKFLOW_CONTRACT_TEXT}</pre>
            </EuiText>
          </EuiCallOut>
        </>
      )}

      <EuiSpacer size="l" />

      <EuiAccordion
        id="formatOverrides"
        buttonContent={
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h4>
                  {i18n.translate('xpack.dataSources.settings.extraction.formatOverrides.title', {
                    defaultMessage: 'Per-format overrides',
                  })}
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            {overrideCount > 0 && (
              <EuiFlexItem grow={false}>
                <EuiBadge>{overrideCount}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        }
        paddingSize="m"
      >
        <EuiText size="xs" color="subdued">
          {i18n.translate(
            'xpack.dataSources.settings.extraction.formatOverrides.description',
            {
              defaultMessage:
                'Route specific file types to different extraction methods. For example, send PDFs to an inference endpoint while keeping everything else on Tika.',
            }
          )}
        </EuiText>
        <EuiSpacer size="m" />

        {Object.entries(formatOverrides).map(([ext, override]) => (
          <React.Fragment key={ext}>
            <FormatOverrideRow
              extension={ext}
              override={override}
              endpointOptions={endpointOptions}
              endpointsLoading={endpointsLoading}
              workflowOptions={workflowOptions}
              workflowsLoading={workflowsLoading}
              onChange={handleFormatOverrideChange}
              onRemove={handleRemoveFormatOverride}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        ))}

        <EuiFormRow
          label={i18n.translate('xpack.dataSources.settings.extraction.formatOverrides.addLabel', {
            defaultMessage: 'Add format override',
          })}
        >
          <EuiComboBox
            singleSelection={{ asPlainText: true }}
            options={formatDropdownOptions}
            selectedOptions={[]}
            onChange={handleAddFormatFromDropdown}
            placeholder={i18n.translate(
              'xpack.dataSources.settings.extraction.formatOverrides.selectPlaceholder',
              { defaultMessage: 'Select a file format...' }
            )}
            compressed
            data-test-subj="addFormatOverrideDropdown"
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiAccordion
          id="advancedJsonOverrides"
          buttonContent={
            <EuiTitle size="xxs">
              <h5>
                {i18n.translate('xpack.dataSources.settings.extraction.advanced.title', {
                  defaultMessage: 'Advanced: JSON editor',
                })}
              </h5>
            </EuiTitle>
          }
          paddingSize="s"
          onToggle={handleAdvancedToggle}
        >
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.dataSources.settings.extraction.advanced.description', {
              defaultMessage:
                'Paste or edit a JSON map of format overrides directly. Keys are file extensions (e.g. ".pdf"), values are objects with "method" and optional "inferenceId".',
            })}
          </EuiText>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {`// Example:\n${JSON.stringify(
              {
                '.pdf': { method: 'inference', inferenceId: 'my-vision-model' },
                '.docx': { method: 'tika' },
                '.html': { method: 'workflow', workflowId: 'my-html-extractor' },
              },
              null,
              2
            )}`}
          </EuiCodeBlock>
          <EuiSpacer size="s" />
          <EuiTextArea
            value={advancedJson}
            onChange={(e) => {
              setAdvancedJson(e.target.value);
              setAdvancedJsonError(undefined);
            }}
            rows={8}
            fullWidth
            isInvalid={!!advancedJsonError}
            data-test-subj="advancedJsonOverridesTextarea"
          />
          {advancedJsonError && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut size="s" color="danger" title={advancedJsonError} />
            </>
          )}
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            iconType="check"
            onClick={handleAdvancedJsonApply}
            data-test-subj="applyAdvancedJsonButton"
          >
            {i18n.translate('xpack.dataSources.settings.extraction.advanced.apply', {
              defaultMessage: 'Apply JSON',
            })}
          </EuiButtonEmpty>
        </EuiAccordion>
      </EuiAccordion>

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            onClick={handleSave}
            isLoading={isUpdating}
            disabled={!hasChanges}
            data-test-subj="saveExtractionConfigButton"
          >
            {i18n.translate('xpack.dataSources.settings.extraction.save', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
