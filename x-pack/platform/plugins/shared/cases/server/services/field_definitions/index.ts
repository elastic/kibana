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
      /**
       * Bound, parameterless callback that asks the cases-analytics v2
       * subsystem to recompute and persist this space's runtime field map.
       * Fire-and-forget — never awaited; never throws past this service.
       *
       * Called at the tail of every field-definition create / update / delete.
       * A field definition contributes a `case.<snake>` runtime field when it is
       * global (`isGlobal: true`) or referenced by a template via `$ref`, so a
       * mutation here can shift a space's runtime field map exactly like a
       * template edit does. The cases client factory binds this to the current
       * request's space + SO client; when v2 is disabled the bound function is a
       * no-op (see `V2_NOOP_DATA_VIEW_REFRESHER`).
       */
      refreshAnalyticsV2DataView: () => void;
    }
  ) {}

  /**
   * Returns field definitions for the given owner(s).
   *
   * `isGlobal: true`  — returns only definitions flagged as global.
   * `isGlobal: false` — same as `undefined`: returns ALL definitions.
   *
   * NOTE: `isGlobal` filtering is done in application code (not via KQL) because
   * the `isGlobal` boolean is not reliably indexed for all documents (e.g. documents
   * created before the mapping was applied). In-app filtering on `_source` is always
   * accurate.
   */
  async getFieldDefinitions(
    owner: string | string[],
    { isGlobal }: { isGlobal?: boolean } = {}
  ): Promise<FieldDefinitionsFindResponse> {
    // Dedupe to prevent duplicate owners from inflating the perPage multiplier.
    const owners = [...new Set(castArray(owner))];

    if (owners.length === 0) {
      return { fieldDefinitions: [], total: 0 };
    }

    const ownerFilter = owners
      .map((o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`)
      .join(' OR ');

    const result = await this.dependencies.unsecuredSavedObjectsClient.find<FieldDefinition>({
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      filter: ownerFilter,
      perPage: MAX_FIELD_DEFINITIONS_PER_OWNER * owners.length,
    });

    const allDefs = result.saved_objects.map((so) => so.attributes);

    const fieldDefinitions =
      isGlobal === true ? allDefs.filter((fd) => fd.isGlobal === true) : allDefs;

    return {
      fieldDefinitions,
      total: fieldDefinitions.length,
    };
  }

  /**
   * Fetches `isGlobal: true` field definitions for extended-field search.
   * When `owner` is omitted or empty, returns global defs for all owners
   * (mirrors `getTemplateVersionsForExtendedFieldSearch` semantics).
   */
  async getGlobalFieldDefinitionsForSearch(params: {
    owner?: string[];
  }): Promise<FieldDefinition[]> {
    const owners = params.owner?.length ? [...new Set(params.owner.filter(Boolean))] : [];
    const ownerFilter =
      owners.length > 0
        ? owners
            .map(
              (o) => `${CASE_FIELD_DEFINITION_SAVED_OBJECT}.attributes.owner: "${escapeKuery(o)}"`
            )
            .join(' OR ')
        : undefined;

    const result = await this.dependencies.unsecuredSavedObjectsClient.find<FieldDefinition>({
      type: CASE_FIELD_DEFINITION_SAVED_OBJECT,
      filter: ownerFilter,
      perPage: 10000,
    });

    return result.saved_objects.map((so) => so.attributes).filter((fd) => fd.isGlobal === true);
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
    const created = await this.dependencies.unsecuredSavedObjectsClient.create<FieldDefinition>(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      { ...input, fieldDefinitionId: id },
      { id }
    );

    // A new definition can introduce a runtime field (global, or once a template
    // $refs it). Tell cases-analytics v2 to recompute the per-space map.
    // Fire-and-forget; failures are caught + logged inside the v2 service.
    this.dependencies.refreshAnalyticsV2DataView();

    return created;
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

    // An edit may flip `isGlobal`, rename the field, or change its type — any of
    // which shifts a space's runtime field map. Tell v2 to refresh.
    this.dependencies.refreshAnalyticsV2DataView();

    return this.getFieldDefinition(id);
  }

  async deleteFieldDefinition(id: string): Promise<void> {
    await this.dependencies.unsecuredSavedObjectsClient.delete(
      CASE_FIELD_DEFINITION_SAVED_OBJECT,
      id
    );

    // A removed definition drops its runtime field. Tell v2 to refresh.
    this.dependencies.refreshAnalyticsV2DataView();
  }
}
