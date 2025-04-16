/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mappingFromFieldMap } from '@kbn/alerting-plugin/common';
import { ECS_COMPONENT_TEMPLATE_NAME } from '@kbn/alerting-plugin/server';
import { Logger } from '@kbn/core/server';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import { Dataset, createPersistenceRuleTypeWrapper } from '@kbn/rule-registry-plugin/server';
import { StreamsPluginSetupDependencies } from '../../types';
import { esqlRuleType } from './esql/register';

interface Props {
  plugins: StreamsPluginSetupDependencies;
  logger: Logger;
}

export function registerRules({ plugins, logger }: Props) {
  const ruleDataClient = plugins.ruleRegistry.ruleDataService.initializeIndex({
    feature: 'observability',
    registrationContext: 'observability.streams',
    dataset: Dataset.alerts,
    componentTemplateRefs: [ECS_COMPONENT_TEMPLATE_NAME],
    componentTemplates: [
      {
        name: 'mappings',
        mappings: mappingFromFieldMap(technicalRuleFieldMap, false),
      },
    ],
  });

  const persistenceRuleTypeWrapper = createPersistenceRuleTypeWrapper({
    ruleDataClient,
    logger,
    formatAlert: undefined,
  });

  plugins.alerting.registerType(persistenceRuleTypeWrapper(esqlRuleType()));
}
