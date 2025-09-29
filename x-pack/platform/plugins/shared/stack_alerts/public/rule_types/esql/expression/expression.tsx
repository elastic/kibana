/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleTypeParamsExpressionProps } from '@kbn/triggers-actions-ui-plugin/public';
import type { EsQueryRuleParams, EsQueryRuleMetaData } from '../types';
import { isSearchSourceRule } from '../util';
import { ALL_EXPRESSION_ERROR_KEYS } from '../constants';
import { EsqlQueryExpression } from './esql_query_expression';

export const EsQueryRuleTypeExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<EsQueryRuleParams, EsQueryRuleMetaData>
> = (props) => {
  const { ruleParams, errors } = props;
  const isSearchSource = isSearchSourceRule(ruleParams);

  const expressionGenericErrorMessage = i18n.translate(
    'xpack.stackAlerts.esQuery.ui.alertParams.fixErrorInExpressionBelowValidationMessage',
    {
      defaultMessage: 'Expression contains errors.',
    }
  );

  const errorParam =
    ALL_EXPRESSION_ERROR_KEYS.find((errorKey) => {
      return (
        // @ts-expect-error upgrade typescript v5.1.6
        errors[errorKey]?.length >= 1 && ruleParams[errorKey] !== undefined
      );
    }) ||
    // For search source alerts, if the only error is timeField, show this error even if the param is undefined
    // timeField is inherently a part of the selectable data view, so if the user selects a data view with no
    // timeField, this data view is incompatible with the rule.
    (isSearchSource && !!errors.timeField?.length && !errors.searchConfiguration?.length
      ? 'timeField'
      : undefined);

  const expressionError = !!errorParam && (
    <>
      <EuiCallOut
        color="danger"
        size="s"
        data-test-subj="esQueryAlertExpressionError"
        title={
          ['index', 'searchType', 'timeField'].includes(errorParam)
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

      {/* Showing the selected type */}
      <EsqlQueryExpression {...props} ruleParams={ruleParams} />
    </>
  );
};
