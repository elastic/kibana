/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { AlertTypeParams } from '../../../../plugins/alerting/common';
import { RuleTypeModel, ValidationResult } from '../../../../plugins/triggers_actions_ui/public';
import { WebhookRuleId, WebhookRuleDescription } from '../../common';

interface Params extends AlertTypeParams {
  url?: string;
}

interface ErrorsProp {
  [key: string]: string[];
}

interface ParamsProps {
  ruleParams: { url?: string };
  setRuleParams: (property: string, value: any) => void;
  errors: ErrorsProp;
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
  const result: ValidationResult = { errors: { url: [] as string[] } };

  if (!params.url) {
    result.errors.url.push('URL required');
  }
  return result;
}

const DefaultRoute = '/_dev/webhook_rule_example';
const DefaultHost = 'https://elastic:changeme@localhost:5601';
const DefaultWebhook = `${DefaultHost}${DefaultRoute}`;

export const WebhookRuleExpression: React.FunctionComponent<ParamsProps> = ({
  ruleParams,
  setRuleParams,
  errors,
}) => {
  let url = ruleParams.url;
  if (url == null) {
    url = DefaultWebhook;
    setRuleParams('url', url);
  }

  return (
    <Fragment>
      <EuiFlexGroup gutterSize="s" wrap direction="column">
        <EuiFlexItem grow={true}>
          <EuiFormRow label="URL" helpText="URL of the webhook to invoke">
            <EuiFieldText value={url} onChange={onChangeUrl} />
          </EuiFormRow>
          {errorMessagesIfNeeded(errors)}
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer />
    </Fragment>
  );

  function onChangeUrl(event: React.ChangeEvent<HTMLInputElement>) {
    setRuleParams('url', event.target.value.trim());
  }
};

function errorMessagesIfNeeded(errors: ErrorsProp) {
  const allErrors = errors.url.join('; ');
  return (
    <Fragment>
      {allErrors ? (
        <EuiFormRow>
          <EuiCallOut color="danger" size="s" title={allErrors} />
        </EuiFormRow>
      ) : null}
    </Fragment>
  );
}
