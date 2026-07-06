/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { CodeEditor } from '@kbn/code-editor';
import {
  API_VERSIONS,
  EVALS_DATASET_EXAMPLES_URL,
  EVALS_DATASETS_URL,
  type GetEvaluationDatasetsResponse,
} from '@kbn/evals-common';
import type { CoreStart } from '@kbn/core/public';
import type { AddToDatasetFlyoutOpenOptions } from '../../types';

const DEFAULT_TITLE = i18n.translate('xpack.evals.addToDatasetFlyout.title', {
  defaultMessage: 'Add to dataset',
});

const MODE_EXISTING_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.mode.existing', {
  defaultMessage: 'Add to existing dataset',
});

const MODE_NEW_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.mode.new', {
  defaultMessage: 'Create new dataset',
});

const DATASET_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.dataset.label', {
  defaultMessage: 'Dataset',
});

const NEW_DATASET_NAME_LABEL = i18n.translate(
  'xpack.evals.addToDatasetFlyout.newDatasetNameLabel',
  {
    defaultMessage: 'Dataset name',
  }
);

const NEW_DATASET_DESCRIPTION_LABEL = i18n.translate(
  'xpack.evals.addToDatasetFlyout.newDatasetDescriptionLabel',
  { defaultMessage: 'Description' }
);

const EXAMPLES_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.examplesLabel', {
  defaultMessage: 'Examples',
});

const EXAMPLE_JSON_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.exampleJsonLabel', {
  defaultMessage: 'Example JSON',
});

const SELECT_ALL_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.selectAllButton', {
  defaultMessage: 'Select all',
});

const SELECT_NONE_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.selectNoneButton', {
  defaultMessage: 'Select none',
});

const EDIT_EXAMPLE_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.editExampleButton', {
  defaultMessage: 'Edit',
});

const DESTINATION_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.destinationLabel', {
  defaultMessage: 'Destination',
});

const DESTINATION_LOCAL = i18n.translate('xpack.evals.addToDatasetFlyout.destinationLocal', {
  defaultMessage: 'Local',
});

const DESTINATION_REMOTE = i18n.translate('xpack.evals.addToDatasetFlyout.destinationRemote', {
  defaultMessage: 'Remote Kibana',
});

const REMOTE_CONFIG_LABEL = i18n.translate('xpack.evals.addToDatasetFlyout.remoteConfigLabel', {
  defaultMessage: 'Remote',
});

const CANCEL_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.cancelButton', {
  defaultMessage: 'Cancel',
});

const SUBMIT_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.submitButton', {
  defaultMessage: 'Add',
});

const LOAD_DATASETS_ERROR = i18n.translate('xpack.evals.addToDatasetFlyout.loadDatasetsError', {
  defaultMessage: 'Failed to load datasets',
});

const SUBMIT_ERROR = i18n.translate('xpack.evals.addToDatasetFlyout.submitError', {
  defaultMessage: 'Failed to add to dataset',
});

const ERROR_CALLOUT_TITLE = i18n.translate('xpack.evals.addToDatasetFlyout.errorCalloutTitle', {
  defaultMessage: 'Something went wrong',
});

const SUCCESS_TOAST_TITLE_SINGLE = i18n.translate(
  'xpack.evals.addToDatasetFlyout.successToastTitleSingle',
  {
    defaultMessage: 'Added example to dataset',
  }
);

const getSuccessToastTitle = (count: number) =>
  i18n.translate('xpack.evals.addToDatasetFlyout.successToastTitle', {
    defaultMessage: 'Added {count, plural, one {# example} other {# examples}} to dataset',
    values: { count },
  });

const NO_EXAMPLES_SELECTED_ERROR = i18n.translate(
  'xpack.evals.addToDatasetFlyout.noExamplesSelectedError',
  { defaultMessage: 'Select at least one example.' }
);

const VIEW_DATASET_BUTTON = i18n.translate('xpack.evals.addToDatasetFlyout.viewDatasetButton', {
  defaultMessage: 'View dataset',
});

type Mode = 'existing' | 'new';
type DestinationType = 'local' | 'remote';

const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

const parseJsonObject = (value: string, fieldLabel: string): Record<string, unknown> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      i18n.translate('xpack.evals.addToDatasetFlyout.jsonParseError', {
        defaultMessage: '{fieldLabel}: {message}',
        values: { fieldLabel, message },
      })
    );
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(
      i18n.translate('xpack.evals.addToDatasetFlyout.jsonMustBeObject', {
        defaultMessage: '{fieldLabel} must be a JSON object.',
        values: { fieldLabel },
      })
    );
  }

  return parsed as Record<string, unknown>;
};

export function AddToDatasetFlyout({
  coreStart,
  options,
  onClose,
}: {
  coreStart: CoreStart;
  options: AddToDatasetFlyoutOpenOptions;
  onClose: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const isBatchMode = Boolean(options.initialExamples?.length);

  const [mode, setMode] = useState<Mode>('existing');
  const [destinationType, setDestinationType] = useState<DestinationType>('local');
  const [remotes, setRemotes] = useState<Array<{ id: string; displayName: string; url: string }>>(
    []
  );
  const [selectedRemoteId, setSelectedRemoteId] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<GetEvaluationDatasetsResponse['datasets']>([]);
  const [isLoadingDatasets, setIsLoadingDatasets] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDescription, setNewDatasetDescription] = useState('');
  const [batchExamples, setBatchExamples] = useState<
    Array<{ label: string; selected: boolean; json: string }>
  >(() =>
    (options.initialExamples ?? []).map((ex) => ({
      label: ex.label,
      selected: ex.selected ?? true,
      json: prettyJson({
        input: ex.input ?? {},
        output: ex.output ?? {},
        metadata: ex.metadata === undefined ? {} : ex.metadata,
      }),
    }))
  );
  const [activeBatchExampleIndex, setActiveBatchExampleIndex] = useState(0);
  const [exampleJson, setExampleJson] = useState(() =>
    prettyJson({
      input: options.initialExample?.input ?? options.initialExamples?.[0]?.input ?? {},
      output: options.initialExample?.output ?? options.initialExamples?.[0]?.output ?? {},
      metadata:
        options.initialExample?.metadata !== undefined
          ? options.initialExample.metadata
          : options.initialExamples?.[0]?.metadata !== undefined
          ? options.initialExamples[0].metadata
          : {},
    })
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let didCancel = false;

    coreStart.http
      .get<{ remotes: Array<{ id: string; displayName: string; url: string }> }>(
        '/internal/evals/remotes',
        { version: API_VERSIONS.internal.v1 }
      )
      .then((resp) => {
        if (!didCancel) {
          setRemotes(resp.remotes ?? []);
        }
      })
      .catch(() => {
        // Remotes are optional; failures should not block the local dataset flow.
      });

    return () => {
      didCancel = true;
    };
  }, [coreStart.http]);

  useEffect(() => {
    let didCancel = false;

    const loadDatasets = async () => {
      setIsLoadingDatasets(true);
      setFormError(null);
      try {
        const destination =
          destinationType === 'remote' && selectedRemoteId ? { destination: selectedRemoteId } : {};

        const datasetsResp = await coreStart.http.get<GetEvaluationDatasetsResponse>(
          EVALS_DATASETS_URL,
          {
            query: { page: 1, per_page: 1000, ...destination },
            version: API_VERSIONS.internal.v1,
          }
        );

        if (!didCancel) {
          setDatasets(datasetsResp.datasets ?? []);
        }
      } catch (error) {
        if (!didCancel) {
          setFormError(`${LOAD_DATASETS_ERROR}: ${String(error)}`);
          setDatasets([]);
        }
      } finally {
        if (!didCancel) {
          setIsLoadingDatasets(false);
        }
      }
    };

    loadDatasets();
    return () => {
      didCancel = true;
    };
  }, [coreStart.http, destinationType, selectedRemoteId]);

  useEffect(() => {
    setSelectedDatasetId(null);
  }, [destinationType, selectedRemoteId]);

  const datasetOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return datasets.map((d) => ({
      label: d.name,
      value: d.id,
      // Show ID to avoid ambiguity when names collide.
      // Users can still search by name; the editor is the key experience.
      append: (
        <EuiText size="xs" color="subdued">
          {d.id.slice(0, 8)}…
        </EuiText>
      ),
    }));
  }, [datasets]);

  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    if (!selectedDatasetId) return [];
    const match = datasetOptions.find((o) => o.value === selectedDatasetId);
    return match ? [match] : [];
  }, [datasetOptions, selectedDatasetId]);

  const remoteOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    return remotes.map((r) => ({
      label: r.displayName,
      value: r.id,
      append: (
        <EuiText
          size="xs"
          color="subdued"
          css={{
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {r.url}
        </EuiText>
      ),
    }));
  }, [remotes]);

  const selectedRemoteOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    if (!selectedRemoteId) return [];
    const match = remoteOptions.find((o) => o.value === selectedRemoteId);
    return match ? [match] : [];
  }, [remoteOptions, selectedRemoteId]);

  const selectedBatchExampleCount = useMemo(
    () => batchExamples.filter((e) => e.selected).length,
    [batchExamples]
  );

  const activeBatchExample = useMemo(
    () => batchExamples[activeBatchExampleIndex],
    [batchExamples, activeBatchExampleIndex]
  );

  const updateBatchExample = (index: number, update: Partial<(typeof batchExamples)[number]>) => {
    setBatchExamples((prev) => prev.map((e, i) => (i === index ? { ...e, ...update } : e)));
  };

  const setAllBatchExamplesSelected = (selected: boolean) => {
    setBatchExamples((prev) => prev.map((e) => ({ ...e, selected })));
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      const examples = (() => {
        if (!isBatchMode) {
          const parsed = parseJsonObject(exampleJson, EXAMPLE_JSON_LABEL);
          const input = (parsed.input ?? {}) as Record<string, unknown>;
          const output = (parsed.output ?? {}) as Record<string, unknown>;
          const metadata =
            parsed.metadata == null ? null : (parsed.metadata as Record<string, unknown> | null);
          return [{ input, output, metadata }];
        }

        const selected = batchExamples.filter((e) => e.selected);
        if (selected.length === 0) {
          throw new Error(NO_EXAMPLES_SELECTED_ERROR);
        }

        return selected.map((e) => {
          const parsed = parseJsonObject(
            e.json,
            i18n.translate('xpack.evals.addToDatasetFlyout.batchExampleJsonLabel', {
              defaultMessage: 'Example JSON ({label})',
              values: { label: e.label },
            })
          );

          const input = (parsed.input ?? {}) as Record<string, unknown>;
          const output = (parsed.output ?? {}) as Record<string, unknown>;
          const metadata =
            parsed.metadata == null ? null : (parsed.metadata as Record<string, unknown> | null);
          return { input, output, metadata };
        });
      })();

      const destinationQuery =
        destinationType === 'remote'
          ? {
              destination: (() => {
                if (!selectedRemoteId) {
                  throw new Error(
                    i18n.translate('xpack.evals.addToDatasetFlyout.remoteRequired', {
                      defaultMessage: 'Select a remote.',
                    })
                  );
                }
                return selectedRemoteId;
              })(),
            }
          : undefined;

      const showViewDatasetAction = destinationType === 'local';

      const addSuccessToast = (datasetId: string, count: number) => {
        const title =
          count === 1 && !isBatchMode ? SUCCESS_TOAST_TITLE_SINGLE : getSuccessToastTitle(count);

        if (!showViewDatasetAction) {
          coreStart.notifications.toasts.addSuccess(title);
          return;
        }

        const toast = coreStart.notifications.toasts.addSuccess({
          title,
          text: toMountPoint(
            <EuiButton
              size="s"
              onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
                ev.preventDefault();
                coreStart.application.navigateToApp('management', {
                  path: `ai/evals/datasets/${datasetId}`,
                });
                coreStart.notifications.toasts.remove(toast);
              }}
            >
              {VIEW_DATASET_BUTTON}
            </EuiButton>,
            coreStart
          ),
        });
      };

      if (mode === 'existing') {
        if (!selectedDatasetId) {
          throw new Error(
            i18n.translate('xpack.evals.addToDatasetFlyout.datasetRequired', {
              defaultMessage: 'Select a dataset.',
            })
          );
        }

        const url = EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', selectedDatasetId);
        await coreStart.http.post(url, {
          query: destinationQuery,
          body: JSON.stringify({
            examples,
          }),
          version: API_VERSIONS.internal.v1,
        });

        addSuccessToast(selectedDatasetId, examples.length);
        onClose();
        return;
      }

      if (!newDatasetName.trim()) {
        throw new Error(
          i18n.translate('xpack.evals.addToDatasetFlyout.datasetNameRequired', {
            defaultMessage: 'Enter a dataset name.',
          })
        );
      }

      // Create dataset, then add example.
      const createResp = await coreStart.http.post<{ dataset_id: string }>(EVALS_DATASETS_URL, {
        query: destinationQuery,
        body: JSON.stringify({
          name: newDatasetName.trim(),
          description: newDatasetDescription,
        }),
        version: API_VERSIONS.internal.v1,
      });

      const createdId = createResp.dataset_id;
      const examplesUrl = EVALS_DATASET_EXAMPLES_URL.replace('{datasetId}', createdId);
      await coreStart.http.post(examplesUrl, {
        query: destinationQuery,
        body: JSON.stringify({
          examples,
        }),
        version: API_VERSIONS.internal.v1,
      });

      addSuccessToast(createdId, examples.length);
      onClose();
    } catch (error) {
      setFormError(`${SUBMIT_ERROR}: ${String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = options.title ?? DEFAULT_TITLE;

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody
        css={{
          '.euiFlyoutBody__overflow': { display: 'flex', flexDirection: 'column' },
          '.euiFlyoutBody__overflowContent': {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
          },
        }}
      >
        {formError ? (
          <>
            <EuiCallOut title={ERROR_CALLOUT_TITLE} color="danger" iconType="error" size="s">
              <p>{formError}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiForm
          component="form"
          id="evalsAddToDatasetForm"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (!isSubmitting) onSubmit();
          }}
          css={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
        >
          {remotes.length > 0 ? (
            <>
              <EuiFormRow label={DESTINATION_LABEL}>
                <EuiRadioGroup
                  options={[
                    { id: 'local', label: DESTINATION_LOCAL },
                    { id: 'remote', label: DESTINATION_REMOTE },
                  ]}
                  idSelected={destinationType}
                  onChange={(id) => setDestinationType(id as DestinationType)}
                  name="evalsAddToDatasetDestination"
                />
              </EuiFormRow>
              {destinationType === 'remote' ? (
                <EuiFormRow label={REMOTE_CONFIG_LABEL} fullWidth>
                  <EuiComboBox
                    fullWidth
                    options={remoteOptions}
                    selectedOptions={selectedRemoteOptions}
                    onChange={(items) => setSelectedRemoteId(items[0]?.value ?? null)}
                    singleSelection={{ asPlainText: true }}
                    placeholder={i18n.translate(
                      'xpack.evals.addToDatasetFlyout.remotePlaceholder',
                      { defaultMessage: 'Select a remote' }
                    )}
                  />
                </EuiFormRow>
              ) : null}
              <EuiSpacer size="m" />
            </>
          ) : null}

          <EuiFormRow>
            <EuiRadioGroup
              options={[
                { id: 'existing', label: MODE_EXISTING_LABEL },
                { id: 'new', label: MODE_NEW_LABEL },
              ]}
              idSelected={mode}
              onChange={(id) => setMode(id as Mode)}
              name="evalsAddToDatasetMode"
            />
          </EuiFormRow>

          {mode === 'existing' ? (
            <EuiFormRow label={DATASET_LABEL} fullWidth>
              <EuiComboBox
                fullWidth
                isLoading={isLoadingDatasets}
                options={datasetOptions}
                selectedOptions={selectedOptions}
                onChange={(items) => setSelectedDatasetId(items[0]?.value ?? null)}
                singleSelection={{ asPlainText: true }}
                placeholder={i18n.translate('xpack.evals.addToDatasetFlyout.datasetPlaceholder', {
                  defaultMessage: 'Select a dataset',
                })}
              />
            </EuiFormRow>
          ) : (
            <>
              <EuiFormRow label={NEW_DATASET_NAME_LABEL} fullWidth>
                <EuiFieldText
                  fullWidth
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  placeholder={i18n.translate(
                    'xpack.evals.addToDatasetFlyout.datasetNamePlaceholder',
                    { defaultMessage: 'e.g. agent-builder-regressions' }
                  )}
                />
              </EuiFormRow>
              <EuiFormRow label={NEW_DATASET_DESCRIPTION_LABEL} fullWidth>
                <EuiTextArea
                  fullWidth
                  rows={3}
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                />
              </EuiFormRow>
            </>
          )}

          {isBatchMode ? (
            <>
              <EuiFormRow label={EXAMPLES_LABEL} fullWidth>
                <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.translate('xpack.evals.addToDatasetFlyout.selectedCount', {
                            defaultMessage: '{count} selected',
                            values: { count: selectedBatchExampleCount },
                          })}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiFlexGroup gutterSize="s" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              size="xs"
                              onClick={() => setAllBatchExamplesSelected(true)}
                            >
                              {SELECT_ALL_BUTTON}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty
                              size="xs"
                              onClick={() => setAllBatchExamplesSelected(false)}
                            >
                              {SELECT_NONE_BUTTON}
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>

                  <EuiFlexItem grow={false} css={{ maxHeight: 200, overflowY: 'auto' }}>
                    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                      {batchExamples.map((e, index) => {
                        const isActive = index === activeBatchExampleIndex;
                        const label = e.label;
                        return (
                          <EuiFlexItem key={`${index}-${label}`} grow={false}>
                            <EuiFlexGroup
                              alignItems="center"
                              gutterSize="s"
                              responsive={false}
                              css={{
                                padding: 4,
                                borderRadius: 4,
                                background: isActive
                                  ? euiTheme.colors.backgroundBaseSubdued
                                  : undefined,
                              }}
                            >
                              <EuiFlexItem grow={false}>
                                <EuiCheckbox
                                  id={`evalsAddToDatasetExample-${index}`}
                                  checked={e.selected}
                                  onChange={(ev) =>
                                    updateBatchExample(index, { selected: ev.target.checked })
                                  }
                                  aria-label={i18n.translate(
                                    'xpack.evals.addToDatasetFlyout.selectExampleAriaLabel',
                                    {
                                      defaultMessage: 'Select example: {label}',
                                      values: { label },
                                    }
                                  )}
                                />
                              </EuiFlexItem>
                              <EuiFlexItem grow={true}>
                                <EuiButtonEmpty
                                  size="xs"
                                  flush="left"
                                  color={isActive ? 'primary' : 'text'}
                                  onClick={() => setActiveBatchExampleIndex(index)}
                                >
                                  {label}
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                              <EuiFlexItem grow={false}>
                                <EuiButtonEmpty
                                  size="xs"
                                  onClick={() => setActiveBatchExampleIndex(index)}
                                >
                                  {EDIT_EXAMPLE_BUTTON}
                                </EuiButtonEmpty>
                              </EuiFlexItem>
                            </EuiFlexGroup>
                          </EuiFlexItem>
                        );
                      })}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFormRow>

              <EuiFormRow
                label={EXAMPLE_JSON_LABEL}
                helpText={
                  activeBatchExample
                    ? i18n.translate('xpack.evals.addToDatasetFlyout.editingExampleHelp', {
                        defaultMessage: 'Editing: {label}',
                        values: { label: activeBatchExample.label },
                      })
                    : undefined
                }
                fullWidth
                css={{
                  flex: 1,
                  minHeight: 200,
                  '.euiFormRow__fieldWrapper': {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  },
                }}
              >
                <CodeEditor
                  languageId="json"
                  height="100%"
                  value={
                    activeBatchExample?.json ?? prettyJson({ input: {}, output: {}, metadata: {} })
                  }
                  onChange={(value: string) => {
                    if (activeBatchExample) {
                      updateBatchExample(activeBatchExampleIndex, { json: value });
                    }
                  }}
                  options={{
                    minimap: { enabled: false },
                    wordWrap: 'on',
                    automaticLayout: true,
                    lineNumbers: 'on',
                    tabSize: 2,
                    fontSize: 14,
                  }}
                />
              </EuiFormRow>
            </>
          ) : (
            <EuiFormRow
              label={EXAMPLE_JSON_LABEL}
              fullWidth
              css={{
                flex: 1,
                minHeight: 200,
                '.euiFormRow__fieldWrapper': { flex: 1, display: 'flex', flexDirection: 'column' },
              }}
            >
              <CodeEditor
                languageId="json"
                height="100%"
                value={exampleJson}
                onChange={(value: string) => setExampleJson(value)}
                options={{
                  minimap: { enabled: false },
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                  tabSize: 2,
                  fontSize: 14,
                }}
              />
            </EuiFormRow>
          )}
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} disabled={isSubmitting}>
              {CANCEL_BUTTON}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              type="submit"
              form="evalsAddToDatasetForm"
              fill
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              {SUBMIT_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
}
