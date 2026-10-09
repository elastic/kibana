/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { castArray } from 'lodash';
import type { SavedObject } from '@kbn/core/server';
import type { IUsageCounter } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counter';
import type {
  CreateFieldDefinitionInput,
  FieldDefinition,
  UpdateFieldDefinitionInput,
} from '../../../common/types/domain/field_definition/latest';
import type {
  FieldDefinitionsFindRequest,
  FieldDefinitionsFindResponse,
} from '../../../common/types/api/field_definition/v1';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import { MAX_FIELD_DEFINITIONS_PER_OWNER } from '../../../common/constants';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import { createTypedApiError } from '../../common/api_errors';
import { parseFieldDefinitionIdentity } from './utils';

/**
 * API for interacting with field definitions (the reusable fields library).
 */
export interface FieldDefinitionsSubClient {
  getFieldDefinitions(params: FieldDefinitionsFindRequest): Promise<FieldDefinitionsFindResponse>;
  getFieldDefinition(id: string): Promise<SavedObject<FieldDefinition>>;
  createFieldDefinition(input: CreateFieldDefinitionInput): Promise<SavedObject<FieldDefinition>>;
  updateFieldDefinition(
    id: string,
    input: UpdateFieldDefinitionInput
  ): Promise<SavedObject<FieldDefinition>>;
  deleteFieldDefinition(id: string): Promise<void>;
}

/**
 * Creates the interface for field definitions.
 *
 * @ignore
 */
const assertNameMatchesYamlDefinition = (name: string, yamlName: string): void => {
  if (name !== yamlName) {
    throw Boom.badRequest(
      `The name attribute ("${name}") must match the name in the YAML definition ("${yamlName}").`
    );
  }
};

const incrementIdentityRejectionCounters = (
  usageCounter: IUsageCounter | undefined,
  changed: Array<'name' | 'type'>
): void => {
  try {
    if (changed.includes('name')) {
      usageCounter?.incrementCounter({ counterName: 'fieldIdentityImmutableName' });
    }
    if (changed.includes('type')) {
      usageCounter?.incrementCounter({ counterName: 'fieldIdentityImmutableType' });
    }
  } catch {
    // Telemetry must never mask the API response.
  }
};

export const createFieldDefinitionsSubClient = (
  clientArgs: CasesClientArgs
): FieldDefinitionsSubClient => {
  const { services, authorization, usageCounter } = clientArgs;
  const { fieldDefinitionsService } = services;

  const fieldDefinitionsSubClient: FieldDefinitionsSubClient = {
    getFieldDefinitions: async (params: FieldDefinitionsFindRequest) => {
      const owners = params.owner ? castArray(params.owner) : [];
      if (owners.length === 0) {
        throw Boom.badRequest('owner is required');
      }
      await authorization.ensureAuthorized({
        operation: Operations.getFieldDefinitions,
        entities: owners.map((owner) => ({ owner, id: owner })),
      });
      return fieldDefinitionsService.getFieldDefinitions(owners, {
        isGlobal: params.isGlobal,
      });
    },

    getFieldDefinition: async (id: string) => {
      const fieldDef = await fieldDefinitionsService.getFieldDefinition(id);
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: fieldDef.attributes.owner, id: fieldDef.id }],
      });
      return fieldDef;
    },

    createFieldDefinition: async (input: CreateFieldDefinitionInput) => {
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: input.owner, id: input.name }],
      });

      const existing = await fieldDefinitionsService.getFieldDefinitions([input.owner]);

      if (existing.total >= MAX_FIELD_DEFINITIONS_PER_OWNER) {
        throw Boom.badRequest(
          `Cannot create more than ${MAX_FIELD_DEFINITIONS_PER_OWNER} field definitions per owner.`
        );
      }

      const nameLower = input.name.toLowerCase();
      const conflict = existing.fieldDefinitions.find((fd) => fd.name.toLowerCase() === nameLower);
      if (conflict) {
        throw Boom.conflict(
          `A field definition with name "${conflict.name}" already exists for this owner.`
        );
      }

      // The name attribute and the YAML `name` must agree from the moment the
      // definition is created — they become the immutable identity. A malformed
      // YAML is left for the service's full validation to reject.
      const identity = parseFieldDefinitionIdentity(input.definition);
      if (identity) {
        assertNameMatchesYamlDefinition(input.name, identity.name);
      }

      return fieldDefinitionsService.createFieldDefinition(input);
    },

    // Field definitions are library-level objects, not case-level objects. They are
    // not part of any case's audit trail so no UserAction is created for mutations.
    updateFieldDefinition: async (id: string, input: UpdateFieldDefinitionInput) => {
      const fieldDef = await fieldDefinitionsService.getFieldDefinition(id);
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: fieldDef.attributes.owner, id: fieldDef.id }],
      });
      if (input.owner !== fieldDef.attributes.owner) {
        throw Boom.badRequest(
          `Cannot change the owner of a field definition. Current owner: ${fieldDef.attributes.owner}`
        );
      }

      // Identity guard: `name` and YAML `type` determine the `${name}_as_${type}`
      // key under which existing case values are stored (and the Cases analytics
      // runtime field), so they are immutable after creation. Only run the
      // comparison when the submitted YAML parses — a malformed YAML falls
      // through to the service's full validation and is rejected there before
      // any write.
      const submitted = parseFieldDefinitionIdentity(input.definition);
      if (submitted) {
        assertNameMatchesYamlDefinition(input.name, submitted.name);

        const persisted = parseFieldDefinitionIdentity(fieldDef.attributes.definition);
        const changed: Array<'name' | 'type'> = [];

        if (submitted.name !== fieldDef.attributes.name) {
          changed.push('name');
        }
        if (persisted && submitted.type !== persisted.type) {
          changed.push('type');
        }

        if (changed.length > 0) {
          incrementIdentityRejectionCounters(usageCounter, changed);
          throw createTypedApiError({
            statusCode: 409,
            message:
              `Cannot change the ${changed.join(' or ')} of field definition ` +
              `"${fieldDef.attributes.name}". A field's name and type determine how its values ` +
              `are stored in case data and Cases analytics, so they cannot be changed after creation.`,
            attributes: {
              code: CASES_API_ERROR_CODES.FIELD_IDENTITY_IMMUTABLE,
              changed,
            },
          });
        }
      }

      // No per-owner name-uniqueness check on update: the identity guard above
      // guarantees the name cannot change, and the persisted name is already
      // unique for the owner.
      return fieldDefinitionsService.updateFieldDefinition(id, input);
    },

    deleteFieldDefinition: async (id: string) => {
      const fieldDef = await fieldDefinitionsService.getFieldDefinition(id);
      await authorization.ensureAuthorized({
        operation: Operations.manageTemplate,
        entities: [{ owner: fieldDef.attributes.owner, id: fieldDef.id }],
      });

      const { templatesService } = services;
      const referencingTemplates = await templatesService.getActiveTemplatesReferencingField(
        fieldDef.attributes.owner,
        fieldDef.attributes.name
      );

      if (referencingTemplates.length > 0) {
        const names = referencingTemplates.map(({ name }) => `"${name}"`).join(', ');
        throw Boom.conflict(
          `Cannot delete field definition "${fieldDef.attributes.name}": it is referenced by ${referencingTemplates.length} active template(s): ${names}`
        );
      }

      return fieldDefinitionsService.deleteFieldDefinition(id);
    },
  };

  return Object.freeze(fieldDefinitionsSubClient);
};
