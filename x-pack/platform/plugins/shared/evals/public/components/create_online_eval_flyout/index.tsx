/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { API_VERSIONS, EVALS_EVALUATORS_URL, type ListEvaluatorsResponse } from '@kbn/evals-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { useCreateOnlineEvalWorkflow } from '../../hooks/use_online_eval_workflows';
import { buildOnlineEvalWorkflowYaml } from '../../../common/online_evals/workflow_yaml';

const ALLOWED_CONNECTOR_TYPE_IDS = new Set(['.gen-ai', '.bedrock', '.gemini', '.inference']);

interface EvaluatorOption extends EuiComboBoxOptionOption<string> {
  value: string;
  kind: 'llm' | 'code';
  version: string;
}

interface ConnectorOption extends EuiComboBoxOptionOption<string> {
  value: string;
}

interface ConnectorsApiResponseItem {
  id: string;
  name: string;
  connector_type_id: string;
}

export const CreateOnlineEvalFlyout = ({ onClose }: { onClose: () => void }) => {
  const { services } = useKibana();
  const createOnlineEvalWorkflow = useCreateOnlineEvalWorkflow();

  const [name, setName] = React.useState('');
  const [indexPattern, setIndexPattern] = React.useState('traces-agent_builder.otel-default');
  const [extraEsqlWhere, setExtraEsqlWhere] = React.useState('');
  const [windowMinutes, setWindowMinutes] = React.useState(60);
  const [lagMinutes, setLagMinutes] = React.useState(15);
  const [maxTracesPerRun, setMaxTracesPerRun] = React.useState(25);
  const [every, setEvery] = React.useState('1h');
  const [selectedEvaluators, setSelectedEvaluators] = React.useState<EvaluatorOption[]>([]);
  const [selectedConnector, setSelectedConnector] = React.useState<ConnectorOption[]>([]);
  const [evaluatorOptions, setEvaluatorOptions] = React.useState<EvaluatorOption[]>([]);
  const [connectorOptions, setConnectorOptions] = React.useState<ConnectorOption[]>([]);
  const [isLoadingEvaluators, setIsLoadingEvaluators] = React.useState(false);
  const [isLoadingConnectors, setIsLoadingConnectors] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let didCancel = false;

    const loadEvaluators = async () => {
      setIsLoadingEvaluators(true);
      try {
        const response = await services.http!.get<ListEvaluatorsResponse>(EVALS_EVALUATORS_URL, {
          version: API_VERSIONS.internal.v1,
        });

        if (didCancel) {
          return;
        }

        const options: EvaluatorOption[] = response.evaluators.map((evaluator) => {
          const requiresReferenceData = Boolean(evaluator.reference_data_schema?.required);
          const label = evaluator.version
            ? `${evaluator.name}@${evaluator.version} (${evaluator.kind})`
            : `${evaluator.name} (${evaluator.kind})`;

          return {
            label,
            value: evaluator.name,
            kind: evaluator.kind,
            version: evaluator.version,
            disabled: requiresReferenceData,
            toolTipContent: requiresReferenceData
              ? i18n.translate(
                  'xpack.evals.onlineEvaluations.createFlyout.evaluatorReferenceDataRequiredTooltip',
                  {
                    defaultMessage:
                      'This evaluator requires reference data and is not supported in online evaluations yet.',
                  }
                )
              : undefined,
            append: (
              <EuiText color="subdued" size="xs">
                {evaluator.description}
              </EuiText>
            ),
          };
        });
        setEvaluatorOptions(options);
      } catch (error) {
        if (!didCancel) {
          setErrorMessage(
            i18n.translate('xpack.evals.onlineEvaluations.createFlyout.loadEvaluatorsError', {
              defaultMessage: 'Failed to load evaluators: {message}',
              values: { message: String(error) },
            })
          );
        }
      } finally {
        if (!didCancel) {
          setIsLoadingEvaluators(false);
        }
      }
    };

    const loadConnectors = async () => {
      setIsLoadingConnectors(true);
      try {
        const response = await services.http!.get<ConnectorsApiResponseItem[]>(
          '/api/actions/connectors'
        );
        if (didCancel) {
          return;
        }

        setConnectorOptions(
          response
            .filter((connector) => ALLOWED_CONNECTOR_TYPE_IDS.has(connector.connector_type_id))
            .map((connector) => ({
              value: connector.id,
              label: connector.name,
            }))
        );
      } catch (error) {
        if (!didCancel) {
          setErrorMessage(
            i18n.translate('xpack.evals.onlineEvaluations.createFlyout.loadConnectorsError', {
              defaultMessage: 'Failed to load connectors: {message}',
              values: { message: String(error) },
            })
          );
        }
      } finally {
        if (!didCancel) {
          setIsLoadingConnectors(false);
        }
      }
    };

    loadEvaluators();
    loadConnectors();

    return () => {
      didCancel = true;
    };
  }, [services.http]);

  const hasLlmEvaluator = selectedEvaluators.some((option) => option.kind === 'llm');
  const selectedConnectorId = selectedConnector[0]?.value;
  const isConnectorMissing = hasLlmEvaluator && !selectedConnectorId;
  const isSubmitting = createOnlineEvalWorkflow.isLoading;

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage(
        i18n.translate('xpack.evals.onlineEvaluations.createFlyout.nameRequiredError', {
          defaultMessage: 'Enter a name.',
        })
      );
      return;
    }

    if (selectedEvaluators.length === 0) {
      setErrorMessage(
        i18n.translate('xpack.evals.onlineEvaluations.createFlyout.evaluatorsRequiredError', {
          defaultMessage: 'Select at least one evaluator.',
        })
      );
      return;
    }

    if (isConnectorMissing) {
      setErrorMessage(
        i18n.translate('xpack.evals.onlineEvaluations.createFlyout.connectorRequiredError', {
          defaultMessage: 'Select a connector when any selected evaluator is of kind "llm".',
        })
      );
      return;
    }

    const yaml = buildOnlineEvalWorkflowYaml({
      name: name.trim(),
      indexPattern: indexPattern.trim(),
      ...(extraEsqlWhere.trim() ? { extraEsqlWhere: extraEsqlWhere.trim() } : {}),
      windowMinutes,
      lagMinutes,
      maxTracesPerRun,
      every,
      evaluators: selectedEvaluators.map(({ value, version }) => ({
        name: value,
        version,
      })),
      connectorId: selectedConnectorId ?? '',
    });

    try {
      await createOnlineEvalWorkflow.mutateAsync({ yaml });
      onClose();
    } catch (error) {
      setErrorMessage(
        i18n.translate('xpack.evals.onlineEvaluations.createFlyout.submitError', {
          defaultMessage: 'Failed to create online evaluation: {message}',
          values: { message: String(error) },
        })
      );
    }
  };

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.evals.onlineEvaluations.createFlyout.title', {
              defaultMessage: 'Create online evaluation',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {errorMessage ? (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.evals.onlineEvaluations.createFlyout.errorCalloutTitle',
                {
                  defaultMessage: 'Something went wrong',
                }
              )}
              color="danger"
              iconType="error"
              size="s"
            >
              <p>{errorMessage}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        ) : null}

        <EuiCallOut
          title={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.tracingPrereqTitle', {
            defaultMessage: 'Agent Builder tracing prerequisites',
          })}
          color="warning"
          iconType="warning"
          size="s"
        >
          <p>
            {i18n.translate('xpack.evals.onlineEvaluations.createFlyout.tracingPrereqBody', {
              defaultMessage:
                'Groundedness scoring requires tracing enabled with experimental features and all advanced capture settings turned on: includeUserPrompts, includeLlmResponses, and includeToolDetails.',
            })}
          </p>
        </EuiCallOut>

        <EuiSpacer size="m" />

        <EuiForm component="form" id="createOnlineEvalForm" onSubmit={onSubmit}>
          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.nameLabel', {
              defaultMessage: 'Name',
            })}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="onlineEvalCreateNameInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.indexPatternLabel', {
              defaultMessage: 'Source index pattern',
            })}
            helpText={i18n.translate(
              'xpack.evals.onlineEvaluations.createFlyout.indexPatternHelpText',
              {
                defaultMessage: 'TODO: switch to a space-aware Agent Builder traces default.',
              }
            )}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              value={indexPattern}
              onChange={(event) => setIndexPattern(event.target.value)}
              data-test-subj="onlineEvalCreateIndexPatternInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.extraWhereLabel', {
              defaultMessage: 'Optional ES|QL WHERE filter',
            })}
            fullWidth
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={extraEsqlWhere}
              onChange={(event) => setExtraEsqlWhere(event.target.value)}
              data-test-subj="onlineEvalCreateExtraWhereInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.windowLabel', {
              defaultMessage: 'Window (minutes)',
            })}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              min={1}
              value={windowMinutes}
              onChange={(event) => setWindowMinutes(Number(event.target.value) || 1)}
              data-test-subj="onlineEvalCreateWindowInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.lagLabel', {
              defaultMessage: 'Lag (minutes)',
            })}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              min={0}
              value={lagMinutes}
              onChange={(event) => setLagMinutes(Number(event.target.value) || 0)}
              data-test-subj="onlineEvalCreateLagInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.maxTracesLabel', {
              defaultMessage: 'Max traces per run',
            })}
            fullWidth
          >
            <EuiFieldNumber
              fullWidth
              min={1}
              value={maxTracesPerRun}
              onChange={(event) => setMaxTracesPerRun(Number(event.target.value) || 1)}
              data-test-subj="onlineEvalCreateMaxTracesInput"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.everyLabel', {
              defaultMessage: 'Schedule',
            })}
            fullWidth
          >
            <EuiSelect
              fullWidth
              options={[
                { value: '15m', text: '15m' },
                { value: '1h', text: '1h' },
                { value: '6h', text: '6h' },
                { value: '1d', text: '1d' },
              ]}
              value={every}
              onChange={(event) => setEvery(event.target.value)}
              data-test-subj="onlineEvalCreateEverySelect"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.evaluatorsLabel', {
              defaultMessage: 'Evaluators',
            })}
            fullWidth
          >
            <EuiComboBox
              fullWidth
              isLoading={isLoadingEvaluators}
              options={evaluatorOptions}
              selectedOptions={selectedEvaluators}
              onChange={(options) => setSelectedEvaluators(options as EvaluatorOption[])}
              data-test-subj="onlineEvalCreateEvaluatorsCombo"
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('xpack.evals.onlineEvaluations.createFlyout.connectorLabel', {
              defaultMessage: 'Connector',
            })}
            helpText={i18n.translate(
              'xpack.evals.onlineEvaluations.createFlyout.connectorHelpText',
              {
                defaultMessage: 'Required when any selected evaluator kind is llm.',
              }
            )}
            isInvalid={isConnectorMissing}
            error={
              isConnectorMissing
                ? i18n.translate(
                    'xpack.evals.onlineEvaluations.createFlyout.connectorMissingError',
                    {
                      defaultMessage: 'Connector is required for llm evaluators.',
                    }
                  )
                : undefined
            }
            fullWidth
          >
            <EuiComboBox
              isInvalid={isConnectorMissing}
              fullWidth
              isLoading={isLoadingConnectors}
              options={connectorOptions}
              selectedOptions={selectedConnector}
              onChange={(options) => setSelectedConnector(options.slice(0, 1) as ConnectorOption[])}
              singleSelection={{ asPlainText: true }}
              data-test-subj="onlineEvalCreateConnectorCombo"
            />
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} disabled={isSubmitting}>
          {i18n.translate('xpack.evals.onlineEvaluations.createFlyout.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          form="createOnlineEvalForm"
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
          data-test-subj="onlineEvalCreateSubmitButton"
        >
          {i18n.translate('xpack.evals.onlineEvaluations.createFlyout.submitButton', {
            defaultMessage: 'Create online evaluation',
          })}
        </EuiButton>
      </EuiFlyoutFooter>
    </>
  );
};
