/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';

/**
 * An opt-in for the `alerting.v1.alertStatusChanged` workflow trigger.
 *
 * Until at least one opt-in is registered, rule runs build and publish nothing. The caller owns
 * its own enablement signal, so alerting never reads settings or flags on its behalf.
 */
export interface AlertStatusChangedOptIn {
  /**
   * Returns true when status change events should be published for the rule run that the given
   * request belongs to. The request is the rule's own request, scoped to the rule's space, so
   * the answer can differ per space. A check that throws is logged and treated as false.
   */
  isEnabled: (request: KibanaRequest) => Promise<boolean>;
}

interface IsAlertStatusChangedEnabledOptions {
  optIns: readonly AlertStatusChangedOptIn[];
  request: KibanaRequest;
  logger: Logger;
}

/**
 * True when any registered opt-in is enabled for the request. Every check that is reached runs
 * until one returns true, so a failing check can never stop a later one from enabling it.
 */
export const isAlertStatusChangedEnabled = async ({
  optIns,
  request,
  logger,
}: IsAlertStatusChangedEnabledOptions): Promise<boolean> => {
  for (const optIn of optIns) {
    try {
      if (await optIn.isEnabled(request)) {
        return true;
      }
    } catch (e) {
      logger.warn(
        `An alert status changed opt-in check failed, treating it as disabled: ${
          e instanceof Error ? e.message : String(e)
        }`,
        { error: { stack_trace: e instanceof Error ? e.stack : undefined } }
      );
    }
  }
  return false;
};
