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
import {
  CASE_CONFIGURE_SAVED_OBJECT,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import { CASES_API_ERROR_CODES } from '../../../common/constants/error_codes';
import { createTypedApiError } from '../../common/api_errors';
import { parseFieldDefinitionIdentity } from '../../common/utils/field_definitions';
import {
  buildFieldLinkIndexes,
  getActivelyLinkedDefinitionIds,
} from '../../common/utils/field_link_resolution';
import { buildFilter } from '../utils';
import { withUsageCounter } from '../usage_counters';

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
 * Keep this exhaustive so every new client method requires an explicit telemetry decision.
 * Counters measure attempts: `withUsageCounter` increments before the wrapped call, matching
 * cases, attachments, and templates. Create also increments a scope counter
 * (`create_field_definition_global` or `create_field_definition_reusable`) because usage
 * counters have no structured properties.
 *
 * Two caveats: `ensureGlobalFieldDefinitions` and the v1 → v2 migration create global definitions
 * through the service, so the snapshot is the source of truth for how many exist; and reordering
 * has no client method of its own, so `update_field_definition` also counts one increment per
 * definition per reorder.
 */
const usageCounterByMethod = {
  getFieldDefinitions: null,
  getFieldDefinition: null,
  createFieldDefinition: 'create_field_definition',
  updateFieldDefinition: 'update_field_definition',
  deleteFieldDefinition: 'delete_field_definition',
} as const satisfies Record<keyof FieldDefinitionsSubClient, string | null>;

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
  const { services, authorization, usageCounter, unsecuredSavedObjectsClient, clientSource } =
    clientArgs;
  const { fieldDefinitionsService, caseConfigureService } = services;

  /**
   * A4 guard: true when the given definition is **actively linked** — i.e. one
   * of the owner's configured v1 custom fields resolves to it (via `legacyKey`
   * or an unambiguous name match). Actively linked definitions cannot be
   * deleted or demoted from `isGlobal`, or the live customFields mirror would
   * lose its write target while the v1 field stays active.
   *
   * Space-scoped by construction: both the configuration and the definitions
   * are read through the request-scoped SO client.
   */
  const isDefinitionActivelyLinked = async (
    fieldDef: SavedObject<FieldDefinition>
  ): Promise<boolean> => {
    const { owner } = fieldDef.attributes;
    const configurations = await caseConfigureService.find({
      unsecuredSavedObjectsClient,
      options: {
        filter: buildFilter({
          filters: owner,
          field: 'owner',
          operator: 'or',
          type: CASE_CONFIGURE_SAVED_OBJECT,
        }),
      },
    });
    const configuredFields = configurations.saved_objects.flatMap(
      (config) => config.attributes.customFields ?? []
    );
    if (configuredFields.length === 0) {
      return false;
    }

    const definitionSavedObjects = await fieldDefinitionsService.getFieldDefinitionSavedObjects(
      owner
    );
    const indexes = buildFieldLinkIndexes(definitionSavedObjects);
    const activeIds = getActivelyLinkedDefinitionIds(configuredFields, indexes);
    return activeIds.has(fieldDef.attributes.fieldDefinitionId);
  };

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

    createFieldDefinition: withUsageCounter(
      usageCounterByMethod.createFieldDefinition,
      clientArgs,
      async (input: CreateFieldDefinitionInput) => {
        usageCounter?.incrementCounter({
          counterName: input.isGlobal
            ? 'create_field_definition_global'
            : 'create_field_definition_reusable',
          counterType: `cases_client.${clientSource}`,
        });

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
        const conflict = existing.fieldDefinitions.find(
          (fd) => fd.name.toLowerCase() === nameLower
        );
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
      }
    ),

    // Field definitions are library-level objects, not case-level objects. They are
    // not part of any case's audit trail so no UserAction is created for mutations.
    updateFieldDefinition: withUsageCounter(
      usageCounterByMethod.updateFieldDefinition,
      clientArgs,
      async (id: string, input: UpdateFieldDefinitionInput) => {
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

        // A4 demotion guard: an actively linked definition must stay global — the
        // configured v1 custom field renders on every case through this link.
        if (fieldDef.attributes.isGlobal && input.isGlobal === false) {
          if (await isDefinitionActivelyLinked(fieldDef)) {
            throw Boom.conflict(
              `Cannot remove the global flag from field definition "${fieldDef.attributes.name}": ` +
                `it is linked to an active custom field in the Cases settings. Remove the custom ` +
                `field from the configuration first.`
            );
          }
        }

        // No per-owner name-uniqueness check on update: the identity guard above
        // guarantees the name cannot change, and the persisted name is already
        // unique for the owner.
        //
        // Version-guard against the demotion check above: a concurrent configure write that
        // links this definition (and, in doing so, writes to it — e.g. a legacyKey repair)
        // between the isDefinitionActivelyLinked read and this write now surfaces as a 409
        // instead of silently committing the demotion past the guard.
        return fieldDefinitionsService.updateFieldDefinition(id, input, {
          version: fieldDef.version,
        });
      }
    ),

    deleteFieldDefinition: withUsageCounter(
      usageCounterByMethod.deleteFieldDefinition,
      clientArgs,
      async (id: string) => {
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

        // A4 delete guard: a definition linked to a configured v1 custom field is
        // the storage target of the live customFields mirror — deleting it would
        // leave the active v1 field without a v2 identity.
        if (await isDefinitionActivelyLinked(fieldDef)) {
          throw Boom.conflict(
            `Cannot delete field definition "${fieldDef.attributes.name}": it is linked to an ` +
              `active custom field in the Cases settings. Remove the custom field from the ` +
              `configuration first.`
          );
        }

        // Version-guard: see updateFieldDefinition's demotion-guard comment above. Narrows, but
        // (per deleteFieldDefinition's doc) does not fully close, the same TOCTOU window.
        return fieldDefinitionsService.deleteFieldDefinition(id, { version: fieldDef.version });
      }
    ),
  };

  return Object.freeze(fieldDefinitionsSubClient);
};
