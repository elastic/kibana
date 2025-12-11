/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { VisualizationRefSavedObjectType } from '@kbn/onechat-common/attachments';

/**
 * Result of resolving a saved object reference.
 */
export interface SavedObjectResolution {
  /** Whether the saved object was found */
  found: boolean;
  /** The resolved content (attributes) of the saved object */
  content?: unknown;
  /** Title of the saved object */
  title?: string;
  /** Description of the saved object */
  description?: string;
  /** When the saved object was last updated */
  updated_at?: string;
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Interface for resolving saved object references.
 */
export interface SavedObjectResolver {
  /**
   * Resolves a saved object by its ID and type.
   *
   * @param savedObjectId - The ID of the saved object to resolve
   * @param savedObjectType - The type of saved object (lens, visualization, map)
   * @param savedObjectsClient - The saved objects client scoped to the current user
   * @returns The resolution result containing the saved object content or error
   */
  resolve(
    savedObjectId: string,
    savedObjectType: VisualizationRefSavedObjectType,
    savedObjectsClient: SavedObjectsClientContract
  ): Promise<SavedObjectResolution>;
}

/**
 * Saved object type to Kibana saved object type mapping.
 */
const SAVED_OBJECT_TYPE_MAP: Record<VisualizationRefSavedObjectType, string> = {
  lens: 'lens',
  visualization: 'visualization',
  map: 'map',
};

/**
 * Creates a saved object resolver instance.
 *
 * The resolver uses the saved objects client to fetch saved object content
 * when a reference attachment is read. This ensures:
 * - User permissions are respected (uses scoped client)
 * - Content is always fresh (fetched on read)
 * - Graceful handling of deleted objects
 *
 * @returns A SavedObjectResolver instance
 */
export const createSavedObjectResolver = (): SavedObjectResolver => {
  return {
    async resolve(
      savedObjectId: string,
      savedObjectType: VisualizationRefSavedObjectType,
      savedObjectsClient: SavedObjectsClientContract
    ): Promise<SavedObjectResolution> {
      const kibanaType = SAVED_OBJECT_TYPE_MAP[savedObjectType];

      // eslint-disable-next-line no-console
      console.debug('[SavedObjectResolver] Resolving:', { savedObjectId, savedObjectType, kibanaType });

      if (!kibanaType) {
        return {
          found: false,
          error: `Unsupported saved object type: ${savedObjectType}`,
        };
      }

      try {
        // eslint-disable-next-line no-console
        console.debug('[SavedObjectResolver] Calling savedObjectsClient.resolve:', kibanaType, savedObjectId);

        // Use resolve() instead of get() to handle object ID aliasing
        // This is important for cross-space references and migrated saved objects
        const resolveResult = await savedObjectsClient.resolve(kibanaType, savedObjectId);

        // eslint-disable-next-line no-console
        console.debug('[SavedObjectResolver] Resolve result:', {
          outcome: resolveResult.outcome,
          savedObjectId: resolveResult.saved_object?.id,
          aliasTargetId: resolveResult.alias_target_id,
        });

        const savedObject = resolveResult.saved_object;

        if (savedObject.error) {
          return {
            found: false,
            error: savedObject.error.message || 'Failed to retrieve saved object',
          };
        }

        // Handle conflict outcome - object exists with alias
        if (resolveResult.outcome === 'conflict') {
          // eslint-disable-next-line no-console
          console.debug('[SavedObjectResolver] Conflict detected, using alias_target_id:', resolveResult.alias_target_id);
        }

        const attributes = savedObject.attributes as Record<string, unknown>;

        return {
          found: true,
          content: attributes,
          title: attributes.title as string | undefined,
          description: attributes.description as string | undefined,
          updated_at: savedObject.updated_at,
        };
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.debug('[SavedObjectResolver] Error fetching saved object:', error);

        // Handle 404 Not Found
        if (error && typeof error === 'object' && 'output' in error) {
          const boomError = error as { output?: { statusCode?: number } };
          if (boomError.output?.statusCode === 404) {
            return {
              found: false,
              error: `Saved object not found: ${savedObjectType}/${savedObjectId}`,
            };
          }
        }

        // Handle SavedObjectsErrorHelpers errors
        if (error && typeof error === 'object' && 'isBoom' in error) {
          const boomError = error as { isBoom: boolean; message?: string };
          if (boomError.isBoom) {
            return {
              found: false,
              error: boomError.message || 'Failed to retrieve saved object',
            };
          }
        }

        // Re-throw unexpected errors
        throw error;
      }
    },
  };
};

/**
 * Singleton instance of the saved object resolver.
 * Safe to share across requests since it's stateless.
 */
export const savedObjectResolver = createSavedObjectResolver();
