/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Logger } from '@kbn/core/server';
import type { ActionsConfigurationUtilities } from '../actions_config';
import type { ActionTypeRegistry } from '../action_type_registry';
import type { ActionTypeConfig, ActionTypeSecrets } from '../types';
import { buildExecutor } from './executor';
import type { ExecutorParams, SubActionConnectorType } from './types';
import { buildValidators } from './validators';

export const register = <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>({
  actionTypeRegistry,
  connector,
  logger,
  configurationUtilities,
}: {
  configurationUtilities: ActionsConfigurationUtilities;
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  connector: SubActionConnectorType<Config, Secrets>;
  logger: Logger;
}) => {
  const validators = buildValidators<Config, Secrets>({ connector, configurationUtilities });
  const executor = buildExecutor({
    connector,
    logger,
    configurationUtilities,
  });

  actionTypeRegistry.register<Config, Secrets, ExecutorParams, unknown>({
    id: connector.id,
    name: connector.name,
    minimumLicenseRequired: connector.minimumLicenseRequired,
    supportedFeatureIds: connector.supportedFeatureIds,
    validate: validators,
    executor,
    renderParameterTemplates: connector.renderParameterTemplates,
    isSystemActionType: connector.isSystemActionType,
    subFeature: connector.subFeature,
    getService: connector.getService,
    getKibanaPrivileges: connector.getKibanaPrivileges,
    preSaveHook: connector.preSaveHook,
    postSaveHook: connector.postSaveHook,
    postDeleteHook: connector.postDeleteHook,
  });
};
