/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { AlertInstanceContext } from '@kbn/alerting-plugin/server';
import type { ESQLParams } from '@kbn/response-ops-rule-params/esql';

export interface ActionContext extends ESQLActionContext {
  title: string;
  message: string;
}

export interface ESQLActionContext extends AlertInstanceContext {
  date: string;
  hits: estypes.SearchHit[];
  link: string;
  sourceFields: { [key: string]: string[] };
}

interface AddMessagesOpts {
  ruleName: string;
  baseContext: ESQLActionContext;
  params: ESQLParams;
  group: string;
}
export function addMessages({
  ruleName,
  baseContext,
  params,
  group,
}: AddMessagesOpts): ActionContext {
  const title = i18n.translate('xpack.stackAlerts.esql.alertTypeContextSubjectTitle', {
    defaultMessage: `rule ''{name}'' {verb}`,
    values: {
      name: ruleName,
      verb: `matched query and created alert ${group}`,
    },
  });
  const window = `${params.timeWindowSize}${params.timeWindowUnit}`;
  const message = i18n.translate('xpack.stackAlerts.esql.alertTypeContextReasonDescription', {
    defaultMessage: `Created alert {group} in the last {window}.`,
    values: {
      window,
      group,
    },
  });
  return { ...baseContext, title, message };
}
