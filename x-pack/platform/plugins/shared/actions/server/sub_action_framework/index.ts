/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { Logger } from '@kbn/core/server';
import { ActionsConfigurationUtilities } from '../actions_config';

import { ActionTypeRegistry } from '../action_type_registry';
import { register } from './register';
import { SubActionConnectorType } from './types';
import { ActionTypeConfig, ActionTypeSecrets } from '../types';

export const createSubActionConnectorFramework = ({
  actionsConfigUtils: configurationUtilities,
  actionTypeRegistry,
  logger,
}: {
  actionTypeRegistry: PublicMethodsOf<ActionTypeRegistry>;
  logger: Logger;
  actionsConfigUtils: ActionsConfigurationUtilities;
}) => {
  return {
    registerConnector: <Config extends ActionTypeConfig, Secrets extends ActionTypeSecrets>(
      connector: SubActionConnectorType<Config, Secrets>
    ) => {
      register({ actionTypeRegistry, logger, connector, configurationUtilities });
    },
  };
};
