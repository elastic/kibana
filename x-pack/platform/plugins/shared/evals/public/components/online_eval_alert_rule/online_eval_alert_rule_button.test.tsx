/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { OnlineEvalAlertRuleButton } from './online_eval_alert_rule_button';
import { useEvaluator } from '../../hooks/use_evaluators_api';
import { useOnlineScoresPrivileges } from '../../hooks/use_online_scores_privileges';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
  KibanaContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@kbn/alerts-ui-shared', () => ({
  useGetRuleTypesPermissions: jest.fn(),
}));
jest.mock('@kbn/response-ops-rule-form/flyout', () => ({
  RuleForm: ({
    initialValues,
  }: {
    initialValues: { params: { esqlQuery: { esql: string } }; name: string };
  }) => (
    <div data-test-subj="mockRuleForm">
      <span data-test-subj="mockRuleFormName">{initialValues.name}</span>
      <pre data-test-subj="mockRuleFormEsql">{initialValues.params.esqlQuery.esql}</pre>
    </div>
  ),
}));
jest.mock('../../hooks/use_evaluators_api');
jest.mock('../../hooks/use_online_scores_privileges');

const mockedUseKibana = jest.mocked(useKibana);
const mockedUsePermissions = jest.mocked(useGetRuleTypesPermissions);
const mockedUseEvaluator = jest.mocked(useEvaluator);
const mockedUsePrivileges = jest.mocked(useOnlineScoresPrivileges);

const baseServices = {
  http: {},
  notifications: { toasts: {} },
  application: {
    getUrlForApp: (appId: string, { path }: { path: string }) =>
      `http://localhost:5601/app/${appId}${path}`,
  },
  triggersActionsUi: { ruleTypeRegistry: {}, actionTypeRegistry: {} },
  data: {},
  unifiedSearch: {},
  charts: {},
  fieldsMetadata: {},
};

const setPermissions = (authorizedToCreateAnyRules: boolean) => {
  mockedUsePermissions.mockReturnValue({
    authorizedToCreateAnyRules,
    ruleTypesState: { isLoading: false },
  } as unknown as ReturnType<typeof useGetRuleTypesPermissions>);
};

const renderButton = () =>
  render(
    <OnlineEvalAlertRuleButton
      workflowId="workflow-1"
      workflowName="quality monitor"
      spaceId="space-a"
      metrics={[{ metric: 'factuality', evaluatorName: 'correctness' }]}
    />
  );

describe('OnlineEvalAlertRuleButton', () => {
  beforeEach(() => {
    mockedUseKibana.mockReturnValue({
      services: baseServices,
    } as unknown as ReturnType<typeof useKibana>);
    mockedUseEvaluator.mockReturnValue({ data: undefined } as unknown as ReturnType<
      typeof useEvaluator
    >);
    mockedUsePrivileges.mockReturnValue({
      data: { has_read: true },
      isLoading: false,
    } as unknown as ReturnType<typeof useOnlineScoresPrivileges>);
    setPermissions(true);
  });

  it('is shown when the user can create rules', () => {
    renderButton();
    expect(screen.getByTestId('onlineEvalCreateAlertRuleButton')).toBeInTheDocument();
  });

  it('is disabled with a privilege-check error tooltip when the privilege fetch fails', async () => {
    mockedUsePrivileges.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useOnlineScoresPrivileges>);
    renderButton();

    const button = screen.getByTestId('onlineEvalCreateAlertRuleButton');
    expect(button).toBeDisabled();
    fireEvent.mouseOver(button);
    expect(
      await screen.findByText('Could not check your privileges on the online scores index.')
    ).toBeInTheDocument();
    expect(screen.queryByText(/read index privilege/)).not.toBeInTheDocument();
  });

  it('is disabled with an explanatory tooltip when the user cannot read the online scores index', async () => {
    mockedUsePrivileges.mockReturnValue({
      data: { has_read: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useOnlineScoresPrivileges>);
    renderButton();

    const button = screen.getByTestId('onlineEvalCreateAlertRuleButton');
    expect(button).toBeDisabled();
    fireEvent.mouseOver(button);
    expect(
      await screen.findByText(/read index privilege on \.evaluation-online-scores/)
    ).toBeInTheDocument();
  });

  it('is hidden when the user lacks rule privileges', () => {
    setPermissions(false);
    renderButton();
    expect(screen.queryByTestId('onlineEvalCreateAlertRuleButton')).not.toBeInTheDocument();
  });

  it('is hidden when triggersActionsUi is unavailable', () => {
    mockedUseKibana.mockReturnValue({
      services: { ...baseServices, triggersActionsUi: undefined },
    } as unknown as ReturnType<typeof useKibana>);
    renderButton();
    expect(screen.queryByTestId('onlineEvalCreateAlertRuleButton')).not.toBeInTheDocument();
    expect(mockedUsePermissions).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
    expect(mockedUseEvaluator).toHaveBeenCalledWith(undefined);
    expect(mockedUsePrivileges).toHaveBeenCalledWith(false);
  });

  it('prefills the rule query with the space filter, metric and threshold', async () => {
    renderButton();

    fireEvent.click(screen.getByTestId('onlineEvalCreateAlertRuleButton'));
    fireEvent.change(await screen.findByTestId('onlineEvalAlertRuleThreshold'), {
      target: { value: '0.7' },
    });
    fireEvent.click(screen.getByTestId('onlineEvalAlertRuleContinue'));

    const esqlNode = await screen.findByTestId('mockRuleFormEsql');
    await waitFor(() => {
      expect(esqlNode.textContent).toContain('FROM .evaluation-online-scores');
    });
    const esql = esqlNode.textContent ?? '';
    expect(esql).toContain('monitor.id == "workflow-1"');
    expect(esql).toContain('MV_CONTAINS(space_ids, "space-a")');
    expect(esql).toContain('score.name == "factuality"');
    expect(esql).toContain('avg_score < 0.7');
    expect(esql).toContain('/app/evals/online/workflow-1');
  });
});
