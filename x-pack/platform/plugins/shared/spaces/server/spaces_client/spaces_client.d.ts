import type { BuildFlavor } from '@kbn/config/src/types';
import type { ISavedObjectsPointInTimeFinder, ISavedObjectsRepository } from '@kbn/core/server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type { INpreClient } from '@kbn/cps/server/npre';
import type { FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { spaceV1 as v1 } from '../../common';
import type { ConfigType } from '../config';
/**
 * Client interface for interacting with spaces.
 */
export interface ISpacesClient {
    /**
     * Retrieve all available spaces.
     * @param options controls which spaces are retrieved.
     */
    getAll(options?: v1.GetAllSpacesOptions): Promise<v1.GetSpaceResult[]>;
    /**
     * Retrieve a space by its id.
     * @param id the space id.
     */
    get(id: string): Promise<v1.Space>;
    /**
     * Retrieve the persisted disabled features for a space.
     * @param id the space id.
     */
    getPersistedFeatureVisibility(id: string): Promise<string[]>;
    /**
     * Creates a space.
     * @param space the space to create.
     */
    create(space: v1.Space): Promise<v1.Space>;
    /**
     * Updates a space.
     * @param id  the id of the space to update.
     * @param space the updated space.
     */
    update(id: string, space: v1.Space): Promise<v1.Space>;
    /**
     * Returns a {@link ISavedObjectsPointInTimeFinder} to help page through
     * saved objects within the specified space.
     * @param id the id of the space to search.
     */
    createSavedObjectFinder(id: string): ISavedObjectsPointInTimeFinder<unknown, unknown>;
    /**
     * Deletes a space, and all saved objects belonging to that space.
     * @param id the id of the space to delete.
     */
    delete(id: string): Promise<void>;
    /**
     * Disables the specified legacy URL aliases.
     * @param aliases the aliases to disable.
     */
    disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
}
/**
 * Client for interacting with spaces.
 */
export declare class SpacesClient implements ISpacesClient {
    private readonly debugLogger;
    private readonly config;
    private readonly repository;
    private readonly nonGlobalTypeNames;
    private readonly buildFlavour;
    private readonly features;
    private readonly npreClient;
    private readonly isServerless;
    /**
     * A map of deprecated feature IDs to the feature IDs that replace them used to transform the disabled features
     * of a space to make sure they only reference non-deprecated features.
     */
    private readonly deprecatedFeaturesReferences;
    constructor(debugLogger: (message: string) => void, config: ConfigType, repository: ISavedObjectsRepository, nonGlobalTypeNames: string[], buildFlavour: BuildFlavor, features: FeaturesPluginStart, npreClient: INpreClient | undefined);
    getAll(options?: v1.GetAllSpacesOptions): Promise<v1.GetSpaceResult[]>;
    get(id: string): Promise<v1.Space>;
    getPersistedFeatureVisibility(id: string): Promise<string[]>;
    create(space: v1.Space): Promise<v1.Space>;
    update(id: string, space: v1.Space): Promise<v1.Space>;
    createSavedObjectFinder(id: string): ISavedObjectsPointInTimeFinder<unknown, unknown>;
    delete(id: string): Promise<void>;
    disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]): Promise<void>;
    private transformSavedObjectToSpace;
    private generateSpaceAttributes;
    /**
     * Collects a map of all deprecated feature IDs and the feature IDs that replace them.
     * @param features A list of all available Kibana features including deprecated ones.
     */
    private collectDeprecatedFeaturesReferences;
    private isClassicSolution;
    private shouldPreserveStoredDisabledFeatures;
}
