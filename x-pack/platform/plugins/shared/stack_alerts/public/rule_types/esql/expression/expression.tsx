/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { ESQLRuleParams, ESQLRuleMetaData } from '../types';
import { ESQL_EXPRESSION_ERROR_KEYS } from '../constants';
import { EsqlQueryExpression } from './esql_query_expression';

export const ESQLRuleTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<ESQLRuleParams, ESQLRuleMetaData>
> = (props) => {
  const { ruleParams, errors } = props;

  const expressionGenericErrorMessage = i18n.translate(
    'xpack.stackAlerts.esql.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const errorParam = ESQL_EXPRESSION_ERROR_KEYS.find((errorKey) => {
    return errors[errorKey]?.length >= 1 && ruleParams[errorKey] !== undefined;
  });

  const expressionError = !!errorParam && (
    <>
      <EuiCallOut
        announceOnMount
        color="danger"
        size="s"
        data-test-subj="esqAlertExpressionError"
        title={
          ['timeField'].includes(errorParam)
            ? (errors[errorParam] as string)
            : expressionGenericErrorMessage
        }
      />
      <EuiSpacer />
    </>
  );

  return (
    <>
      {expressionError}
      <EsqlQueryExpression {...props} ruleParams={ruleParams} />
      <EuiHorizontalRule />
    </>
  );
};
