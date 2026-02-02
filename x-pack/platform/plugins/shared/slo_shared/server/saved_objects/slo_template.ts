/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import type { SavedObject } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { storedSloTemplateSchema } from '@kbn/slo-schema';
import type * as t from 'io-ts';
import { pick } from 'lodash';
import { SO_SLO_TEMPLATE_TYPE } from '../../common';
import { paths } from '../../common/locators/paths';

type StoredSLOTemplate = t.TypeOf<typeof storedSloTemplateSchema>;

/**
 * We will use the savedObject.id as the template identifier when
 * creating SLOs from templates (create?fromTemplateId=xxxx), so no need to have a separate field
 * in the attributes like we have for SLOs.
 */
export const sloTemplate: SavedObjectsType = {
  name: SO_SLO_TEMPLATE_TYPE,
  hidden: true,
  namespaceType: 'multiple-isolated',
  modelVersions: {
    '1': {
      changes: [],
      schemas: {
        forwardCompatibility: (attributes) => {
          const fields = [
            'name',
            'description',
            'indicator',
            'budgetingMethod',
            'objective',
            'timeWindow',
            'tags',
            'settings',
          ];
          return pick(attributes, fields);
        },
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
    '2': {
      changes: [],
      schemas: {
        forwardCompatibility: (attributes) => {
          const fields = [
            'name',
            'description',
            'indicator',
            'budgetingMethod',
            'objective',
            'timeWindow',
            'tags',
            'settings',
            'groupBy',
            'artifacts',
          ];
          return pick(attributes, fields);
        },
        create: schema.object({}, { unknowns: 'allow' }),
      },
    },
  },
  mappings: {
    dynamic: false,
    properties: {
      name: {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            normalizer: 'lowercase',
          },
        },
      },
      tags: { type: 'keyword' },
    },
  },
  management: {
    importableAndExportable: true,
    getInAppUrl: (savedObject: SavedObject<StoredSLOTemplate>) => {
      return {
        path: paths.sloCreateFromTemplate(savedObject.id),
        uiCapabilitiesPath: '',
      };
    },
    getTitle(template: SavedObject<StoredSLOTemplate>) {
      const templateName =
        'name' in template.attributes && typeof template.attributes.name === 'string'
          ? template.attributes.name
          : 'Unnamed';

      return i18n.translate('xpack.sloShared.sloTemplateSaveObject.title', {
        defaultMessage: 'SLO Template: {name}',
        values: {
          name: templateName,
        },
      });
    },
  },
};
