/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreateOnlineEvalFlyout } from '.';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useCreateOnlineEvalWorkflow } from '../../hooks/use_online_eval_workflows';
import { parseOnlineEvalWorkflowYaml } from '../../../common/online_evals/workflow_yaml';

jest.mock('../../hooks/use_online_eval_workflows');
jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  const MockEuiComboBox = ({
    options = [],
    selectedOptions = [],
    onChange,
    singleSelection,
    'data-test-subj': dataTestSubj,
  }: {
    options?: Array<{ label: string; value?: string; disabled?: boolean }>;
    selectedOptions?: Array<{ label: string; value?: string }>;
    onChange: (newOptions: Array<{ label: string; value?: string }>) => void;
    singleSelection?: { asPlainText?: boolean };
    'data-test-subj'?: string;
  }) => {
    const selectedValues = selectedOptions.map((option) => option.value ?? option.label);
    return (
      <select
        data-test-subj={dataTestSubj}
        multiple={false}
        defaultValue={selectedValues[0] ?? ''}
        onBlur={(event) => {
          const selectedValuesFromDom = Array.from(event.currentTarget.selectedOptions).map(
            (selectedOption) => selectedOption.value
          );
          const selectedValuesFallback =
            selectedValuesFromDom.length > 0
              ? selectedValuesFromDom
              : event.currentTarget.value
              ? [event.currentTarget.value]
              : [];
          const selected = selectedValuesFallback.map((selectedValue) => {
            const match = options.find(
              (option) => (option.value ?? option.label) === selectedValue
            );
            return {
              ...match,
              label: match?.label ?? selectedValue,
              value: match?.value ?? selectedValue,
            };
          });
          onChange(singleSelection ? selected.slice(0, 1) : selected);
        }}
      >
        {!singleSelection ? null : <option value="">--</option>}
        {options.map((option) => (
          <option
            key={option.value ?? option.label}
            value={option.value ?? option.label}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return {
    ...actual,
    EuiComboBox: MockEuiComboBox,
  };
});

const mockedUseKibana = jest.mocked(useKibana);
const mockedUseCreateOnlineEvalWorkflow = jest.mocked(useCreateOnlineEvalWorkflow);

describe('CreateOnlineEvalFlyout', () => {
  const mutateAsync = jest.fn();
  const onClose = jest.fn();
  const httpGet = jest.fn();
  let container: HTMLElement;

  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
    onClose.mockReset();
    httpGet.mockReset();

    httpGet.mockImplementation(async (path: string) => {
      if (path === '/internal/evals/evaluators') {
        return {
          evaluators: [
            {
              name: 'correctness',
              version: '1.2.3',
              kind: 'llm',
              description: 'Checks correctness',
            },
            {
              name: 'cost',
              version: '0.1.0',
              kind: 'code',
              description: 'Estimates costs',
            },
          ],
        };
      }

      if (path === '/api/actions/connectors') {
        return [
          { id: 'connector-allowed', name: 'Judge Connector', connector_type_id: '.gen-ai' },
          { id: 'connector-ignored', name: 'Webhook', connector_type_id: '.webhook' },
        ];
      }

      throw new Error(`Unexpected GET ${path}`);
    });

    mockedUseKibana.mockReturnValue({
      services: {
        http: {
          get: httpGet,
        },
      },
    } as unknown as ReturnType<typeof useKibana>);

    mockedUseCreateOnlineEvalWorkflow.mockReturnValue({
      mutateAsync,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateOnlineEvalWorkflow>);
  });

  const getByTestSubj = (testSubj: string) =>
    container.querySelector(`[data-test-subj="${testSubj}"]`) as HTMLElement;

  it('submits workflow yaml that round-trips to the entered config', async () => {
    ({ container } = render(<CreateOnlineEvalFlyout onClose={onClose} />));

    await waitFor(() =>
      expect(httpGet).toHaveBeenCalledWith('/internal/evals/evaluators', { version: '1' })
    );
    await waitFor(() => expect(httpGet).toHaveBeenCalledWith('/api/actions/connectors'));

    fireEvent.change(getByTestSubj('onlineEvalCreateNameInput'), {
      target: { value: 'nightly monitor' },
    });
    fireEvent.change(getByTestSubj('onlineEvalCreateIndexPatternInput'), {
      target: { value: 'traces-agent_builder.otel-default' },
    });
    fireEvent.change(getByTestSubj('onlineEvalCreateExtraWhereInput'), {
      target: { value: 'attributes.service.name == "assistant"' },
    });
    fireEvent.change(getByTestSubj('onlineEvalCreateWindowInput'), { target: { value: '90' } });
    fireEvent.change(getByTestSubj('onlineEvalCreateLagInput'), { target: { value: '15' } });
    fireEvent.change(getByTestSubj('onlineEvalCreateMaxTracesInput'), { target: { value: '42' } });
    fireEvent.change(getByTestSubj('onlineEvalCreateEverySelect'), { target: { value: '6h' } });

    fireEvent.change(getByTestSubj('onlineEvalCreateEvaluatorsCombo'), {
      target: { value: 'correctness' },
    });
    fireEvent.blur(getByTestSubj('onlineEvalCreateEvaluatorsCombo'), {
      target: { value: 'correctness' },
    });
    fireEvent.change(getByTestSubj('onlineEvalCreateConnectorCombo'), {
      target: { value: 'connector-allowed' },
    });
    fireEvent.blur(getByTestSubj('onlineEvalCreateConnectorCombo'), {
      target: { value: 'connector-allowed' },
    });

    fireEvent.click(getByTestSubj('onlineEvalCreateSubmitButton'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    const mutationArg = mutateAsync.mock.calls[0][0] as { yaml: string };
    const parsed = parseOnlineEvalWorkflowYaml(mutationArg.yaml);

    expect(parsed).toEqual({
      name: 'nightly monitor',
      indexPattern: 'traces-agent_builder.otel-default',
      extraEsqlWhere: 'attributes.service.name == "assistant"',
      windowMinutes: 90,
      lagMinutes: 15,
      maxTracesPerRun: 42,
      every: '6h',
      evaluators: [{ name: 'correctness', version: '1.2.3' }],
      connectorId: 'connector-allowed',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('requires connector when selecting an llm evaluator', async () => {
    ({ container } = render(<CreateOnlineEvalFlyout onClose={onClose} />));

    await waitFor(() =>
      expect(httpGet).toHaveBeenCalledWith('/internal/evals/evaluators', { version: '1' })
    );

    fireEvent.change(getByTestSubj('onlineEvalCreateNameInput'), {
      target: { value: 'monitor no connector' },
    });
    fireEvent.change(getByTestSubj('onlineEvalCreateEvaluatorsCombo'), {
      target: { value: 'correctness' },
    });
    fireEvent.blur(getByTestSubj('onlineEvalCreateEvaluatorsCombo'), {
      target: { value: 'correctness' },
    });

    fireEvent.click(getByTestSubj('onlineEvalCreateSubmitButton'));

    expect(
      await screen.findByText('Select a connector when any selected evaluator is of kind "llm".')
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
