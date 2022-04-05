/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { AlertTypeParams } from '../../../../plugins/alerting/common';
import {
  RuleTypeModel,
  RuleTypeParamsExpressionProps,
  ValidationResult,
} from '../../../../plugins/triggers_actions_ui/public';
import { WebhookRuleId, WebhookRuleDescription } from '../../common';

interface Params extends AlertTypeParams {
  url?: string;
}

export function getRuleType(): RuleTypeModel {
  return {
    id: WebhookRuleId,
    description: WebhookRuleDescription,
    iconClass: 'bolt',
    documentationUrl: null,
    ruleParamsExpression: WebhookRuleExpression,
    requiresAppContext: false,
    validate: validateParams,
  };
}

function validateParams(params: Params): ValidationResult {
  const result = { errors: { url: [] as string[] } };

  if (!params.url) {
    result.errors.url.push('URL required');
  }
  return result;
}

const DefaultRoute = '/_dev/webhook_rule_example';
const DefaultHost = 'https://elastic:changeme@localhost:5601';
const DefaultWebhook = `${DefaultHost}${DefaultRoute}`;

export const WebhookRuleExpression: React.FunctionComponent<
  RuleTypeParamsExpressionProps<Params>
> = ({ ruleParams, setRuleParams }) => {
  const url = ruleParams.url || DefaultWebhook;
  const [errorMessage, setErrorMessage] = useState<string>('');

  function onChangeUrl(event: React.ChangeEvent<HTMLInputElement>) {
    let value = event.target.value.trim();
    if (!value) {
      value = '';
      setErrorMessage('url must be set');
    } else {
      setErrorMessage('');
    }
    setRuleParams('url', value);
  }

  function errorMessageIfNeeded() {
    return (
      <Fragment>
        {errorMessage ? (
          <EuiFormRow>
            <EuiCallOut color="danger" size="s" title={errorMessage} />
          </EuiFormRow>
        ) : null}
      </Fragment>
    );
  }

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow label="URL" helpText="URL of the webhook to invoke">
            <EuiFieldText value={url} onChange={onChangeUrl} />
          </EuiFormRow>
          {errorMessageIfNeeded()}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );
};
