/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty, get } from 'lodash';
import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MappingRuntimeField, MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import { IIndexPatternString } from '../alerts_service/resource_installer_utils';
import { ReportedAlert } from './types';
import {
  AlertInstanceContext,
  AlertInstanceState,
  RuleAlertData,
  WithoutReservedActionGroups,
} from '../types';

export class RuntimeFieldManager {
  private logger: Logger;
  private clientPromise: Promise<ElasticsearchClient>;
  private readonly indexTemplateAndPattern: IIndexPatternString;
  private readonly MAX_RUNTIME_FIELDS = 25;

  private runtimeFields: Record<string, MappingRuntimeField> = {};

  constructor({
    indexTemplateAndPattern,
    logger,
    clientPromise,
  }: {
    indexTemplateAndPattern: IIndexPatternString;
    logger: Logger;
    clientPromise: Promise<ElasticsearchClient>;
  }) {
    this.indexTemplateAndPattern = indexTemplateAndPattern;
    this.logger = logger;
    this.clientPromise = clientPromise;
  }

  public async persistRuntimeFields() {
    const { clientPromise, logger, MAX_RUNTIME_FIELDS, indexTemplateAndPattern } = this;

    if (!isEmpty(this.runtimeFields)) {
      const client = await clientPromise;

      const response = await client.cluster.getComponentTemplate({
        name: indexTemplateAndPattern.componentTemplate,
      });

      const currentTemplate = response.component_templates[0].component_template.template || {};
      const currentMappings = currentTemplate.mappings || {};
      const currentRuntimeFields = currentMappings?.runtime || {};
      const newRuntimeFields = Object.assign({}, currentRuntimeFields, this.runtimeFields);

      const currentRuntimeFieldsCount = Object.keys(currentRuntimeFields).length;
      const newRuntimeFieldsCount = Object.keys(newRuntimeFields).length;

      // if there are new fields
      if (newRuntimeFieldsCount > currentRuntimeFieldsCount) {
        if (newRuntimeFieldsCount <= MAX_RUNTIME_FIELDS) {
          const result = await client.cluster.putComponentTemplate({
            name: indexTemplateAndPattern.componentTemplate,
            template: {
              ...currentTemplate,
              mappings: {
                ...currentMappings,
                runtime: newRuntimeFields,
              },
            },
          });

          await client.indices.putMapping({
            index: indexTemplateAndPattern.name,
            runtime: newRuntimeFields,
          });
          logger.info(`result: ${result}`);
        } else {
          logger.warn(`Can't persist runtime fieds more than ${MAX_RUNTIME_FIELDS}`);
        }
      }
    }
  }

  private mapFieldType(type: string): MappingRuntimeFieldType {
    switch (type) {
      case 'Number':
      case 'BigInt':
        return 'long';
      case 'String':
        return 'keyword';
      case 'Boolean':
        return 'boolean';
      default:
        return 'keyword';
    }
  }

  public addRuntimeFields<
    AlertData extends RuleAlertData,
    LegacyState extends AlertInstanceState,
    LegacyContext extends AlertInstanceContext,
    ActionGroupIds extends string,
    RecoveryActionGroupId extends string
  >(
    alert: ReportedAlert<
      AlertData,
      LegacyState,
      LegacyContext,
      WithoutReservedActionGroups<ActionGroupIds, RecoveryActionGroupId>
    >
  ) {
    if (alert.runtimeFields && alert.runtimeFields.length > 0) {
      alert.runtimeFields.forEach((fieldPath) => {
        const fieldValue = get(alert.payload, fieldPath);
        if (fieldValue) {
          const fieldType = typeof fieldValue;
          this.runtimeFields[fieldPath] = { type: this.mapFieldType(fieldType) };
        }
      });
    }
  }
}
