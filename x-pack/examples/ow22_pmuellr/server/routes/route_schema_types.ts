/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** request body for POST webhook rule example */
export interface PostWebhookRuleExampleRequestBody {
  /** the id of the rule being run */
  ruleId: string;

  /** execution UUID */
  executionId: string;

  /** rule parameters */
  params: Record<string, any>;

  /** old rule state from Kibana */
  state: Record<string, any>;
}

/** query string for POST webhook rule example */
export interface PostWebhookRuleExampleRequestQuery {
  /** use this param to make all instances active */
  active?: string;

  /** use this param to make all instances inactive */
  off?: string;

  /** use this param to make all instances randomly active */
  random?: string;
}

/** response body for POST webhook rule example */
export interface PostWebhookRuleExampleResponseBody {
  /** new rule state to Kibana */
  state: Record<string, any>;

  /** one entry for every alert (instance) */
  instances: Array<{
    /** alert instance id - like host name, service, etc */
    instanceId: string;

    /** action group */
    actionGroup: string;

    /** context variables for actions */
    context: Record<string, any>;
  }>;
}
