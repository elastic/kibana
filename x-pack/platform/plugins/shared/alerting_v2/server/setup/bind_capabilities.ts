/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createToken, OnStart } from '@kbn/core-di';
import { CapabilitiesProvider, CapabilitiesSwitcher, CoreStart } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/saved_object_types';
import { ALERTING_LOG_CODES } from '../lib/errors/error_codes';
import { RuleTemplatesClient } from '../lib/rule_templates_client';
import { LoggerServiceToken } from '../lib/services/logger_service/logger_service';

/**
 * The capability namespace for alerting-v2 system-level flags.
 *
 * Kept separate from per-feature namespaces (e.g. `alerting_v2_rules`) so
 * the security plugin's role-based switcher does not gate them per-user.
 * Consumer code reads these via `core.application.capabilities.alerting_v2`.
 */
const CAPABILITY_NAMESPACE = 'alerting_v2';

/**
 * Mutable capability state populated during `OnStart` and read by the
 * capabilities switcher on every request. Add new keys here when the
 * plugin needs to expose additional system-level flags to the browser.
 */
interface AlertingV2SystemCapabilities {
  v2RuleTemplatesAvailable: boolean;
}

const SystemCapabilitiesRef = createToken<AlertingV2SystemCapabilities>(
  'alerting_v2.SystemCapabilitiesRef'
);

const toCapabilities = (
  state: AlertingV2SystemCapabilities
): Partial<Record<string, Partial<Record<string, boolean>>>> => ({
  [CAPABILITY_NAMESPACE]: { ...state },
});

const DEFAULTS: AlertingV2SystemCapabilities = {
  v2RuleTemplatesAvailable: false,
};

/**
 * Registers alerting-v2 system-level capabilities.
 *
 * These flags describe global state (e.g. "do any rule templates exist?")
 * rather than per-user permissions. Values are resolved server-side with
 * an internal saved objects client so the browser never needs a separate
 * HTTP call.
 *
 * To add a new capability:
 *  1. Add the key to {@link AlertingV2SystemCapabilities} and {@link DEFAULTS}.
 *  2. Populate it inside the `OnStart` handler below.
 *  3. Read it on the client via `core.application.capabilities.alerting_v2.<key>`.
 */
export function bindCapabilities({ bind }: ContainerModuleLoadOptions) {
  const ref: AlertingV2SystemCapabilities = { ...DEFAULTS };
  bind(SystemCapabilitiesRef).toConstantValue(ref);

  bind(CapabilitiesProvider).toConstantValue(() => toCapabilities(DEFAULTS));

  bind(CapabilitiesSwitcher).toConstantValue({
    capabilityPath: `${CAPABILITY_NAMESPACE}.*`,
    switch: async () => toCapabilities(ref),
  });

  bind(OnStart).toConstantValue(async (container) => {
    const savedObjects = container.get(CoreStart('savedObjects'));
    const loggerService = container.get(LoggerServiceToken);
    const logger = loggerService.forSubsystem('capabilities');

    try {
      const internalClient = savedObjects.createInternalRepository([
        RULE_TEMPLATE_SAVED_OBJECT_TYPE,
      ]);
      ref.v2RuleTemplatesAvailable = await RuleTemplatesClient.hasTemplatesAsInternalUser(
        internalClient
      );
    } catch (error) {
      logger.error({
        message: 'Failed to resolve system capabilities',
        code: ALERTING_LOG_CODES.CAPABILITIES_RESOLUTION_FAILED,
        error,
      });
    }
  });
}
