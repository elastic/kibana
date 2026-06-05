/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { castArray } from 'lodash';
import { escapeKuery } from '@kbn/es-query';
import type {
  CreateFieldDefinitionInput,
  FieldDefinition,
  UpdateFieldDefinitionInput,
} from '../../../common/types/domain/field_definition/v1';
import {
  CASE_FIELD_DEFINITION_SAVED_OBJECT,
  MAX_FIELD_DEFINITIONS_PER_OWNER,
} from '../../../common/constants';
import type { FieldDefinitionsFindResponse } from '../../../common/types/api/field_definition/v1';

export class FieldDefinitionsService {
  constructor(
    private readonly dependencies: {
      unsecuredSavedObjectsClient: SavedObjectsClientContract;
    }
  ) {}

  /**
   * Returns field definitions for the given owner(s).
   *
   * `isGlobal: true`  — returns only definitions flagged as global.
   * `isGlobal: false` — same as `undefined`: returns ALL definitions.
   *
   * NOTE: `isGlobal` filtering is done in application code (not via KQL) because
   * some existing documents were created with the legacy `applyToAllCases` attribute
   * name before the rename. Relying on a KQL filter would miss those documents since
   * the old attribute is not in the Elasticsearch mapping and therefore not indexed.
   */
  async getFieldDefinitions(
    owner: string | string[],
    { isGlobal }: { isGlobal?: boolean } = {}
  ): Promise<FieldDefinitionsFindResponse> {
    const owners = castArray(owner);

    if (owners.length === 0) {
      return { fieldDefinitions: [], total: 0 };
    }

    const ownerFilter = owners
      .map((o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`)
      .join(' OR ');

    const result = await this.dependencies.unsecuredSavedObjectsClient.find<
      FieldDefinition & { applyToAllCases?: boolean }
    >({
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      filter: ownerFilter,
      perPage: MAX_FIELD_DEFINITIONS_PER_OWNER * owners.length,
    });

    const allDefs = result.saved_objects.map((so) => so.attributes);

    // Filter by isGlobal in application code to handle documents that were created
    // with the legacy `applyToAllCases` attribute (stored in _source but not indexed).
    const fieldDefinitions =
      isGlobal === true
        ? allDefs.filter((fd) => fd.isGlobal === true || fd.applyToAllCases === true)
        : allDefs;

    return {
      fieldDefinitions,
      total: fieldDefinitions.length,
    };
  }

  async getFieldDefinition(id: string): Promise<SavedObject<FieldDefinition>> {
    return this.dependencies.unsecuredSavedObjectsClient.get<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id
    );
  }

  async createFieldDefinition(
    input: CreateFieldDefinitionInput
  ): Promise<SavedObject<FieldDefinition>> {
    const id = uuidv4();
    return this.dependencies.unsecuredSavedObjectsClient.create<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      { ...input, fieldDefinitionId: id },
      { id }
    );
  }

  async updateFieldDefinition(
    id: string,
    input: UpdateFieldDefinitionInput
  ): Promise<SavedObject<FieldDefinition>> {
    await this.dependencies.unsecuredSavedObjectsClient.update<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id,
      input
    );
    return this.getFieldDefinition(id);
  }

  async deleteFieldDefinition(id: string): Promise<void> {
    await this.dependencies.unsecuredSavedObjectsClient.delete(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id
    );
  }
}
