/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { customAppDefinitionSchema } from '../common/app_definition';
import type { CustomAppDefinition } from '../common/app_definition';
import { CUSTOM_APP_SAVED_OBJECT_TYPE } from '../common/constants';

export interface CustomAppAttributes {
  title: string;
  description?: string;
  appJSON: string;
}

export class InvalidCustomAppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCustomAppError';
  }
}

function toAttributes(definition: CustomAppDefinition): CustomAppAttributes {
  return {
    title: definition.title,
    description: definition.description,
    appJSON: JSON.stringify(definition),
  };
}

export function toCustomApp(object: SavedObject<CustomAppAttributes>) {
  return {
    id: object.id,
    updatedAt: object.updated_at,
    definition: JSON.parse(object.attributes.appJSON) as CustomAppDefinition,
  };
}

/**
 * Single write path for custom apps, shared by the HTTP routes and the Agent
 * Builder tool. Validation lives here rather than at each caller so an app
 * written by an agent is held to exactly the same contract as one written by a
 * human.
 */
export function parseDefinition(candidate: unknown): CustomAppDefinition {
  const parsed = customAppDefinitionSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new InvalidCustomAppError(parsed.error.message);
  }
  return parsed.data;
}

export async function createCustomApp(
  client: SavedObjectsClientContract,
  candidate: unknown
): Promise<{ id: string; definition: CustomAppDefinition }> {
  const definition = parseDefinition(candidate);
  const object = await client.create<CustomAppAttributes>(
    CUSTOM_APP_SAVED_OBJECT_TYPE,
    toAttributes(definition)
  );
  return { id: object.id, definition };
}

export async function updateCustomApp(
  client: SavedObjectsClientContract,
  id: string,
  candidate: unknown
): Promise<{ id: string; definition: CustomAppDefinition }> {
  const definition = parseDefinition(candidate);
  await client.update<CustomAppAttributes>(
    CUSTOM_APP_SAVED_OBJECT_TYPE,
    id,
    toAttributes(definition)
  );
  return { id, definition };
}

function safeShowInNav(appJSON: string): boolean {
  try {
    return JSON.parse(appJSON)?.showInNav === true;
  } catch {
    return false;
  }
}

export async function listCustomApps(client: SavedObjectsClientContract) {
  const found = await client.find<CustomAppAttributes>({
    type: CUSTOM_APP_SAVED_OBJECT_TYPE,
    perPage: 200,
  });
  return found.saved_objects.map((object) => ({
    id: object.id,
    title: object.attributes.title,
    description: object.attributes.description,
    updatedAt: object.updated_at,
    // Parsed rather than mapped so the stored document stays the single source
    // of truth; the listing is small enough that the cost does not matter.
    showInNav: safeShowInNav(object.attributes.appJSON),
  }));
}
