import type { ParsedPluginArchive, PluginDefinition } from '@kbn/agent-builder-common';
import type { PluginProperties } from './storage';
import type { PluginDocument, PersistedPluginDefinition, PluginCreateRequest, PluginUpdateRequest } from './types';
export declare const fromEs: (document: PluginDocument) => PersistedPluginDefinition;
export declare const createRequestToEs: ({ id, createRequest, space, creationDate, }: {
    id: string;
    createRequest: PluginCreateRequest;
    space: string;
    creationDate?: Date;
}) => PluginProperties;
/**
 * Converts a parsed plugin archive into a
 * {@link PluginCreateRequest} suitable for the persistence client.
 */
export declare const parsedArchiveToCreateRequest: ({ parsedArchive, sourceUrl, skillIds, nameOverride, }: {
    parsedArchive: ParsedPluginArchive;
    sourceUrl?: string;
    skillIds: string[];
    nameOverride?: string;
}) => PluginCreateRequest;
export declare const toPluginDefinition: (persisted: PersistedPluginDefinition) => PluginDefinition;
export declare const updateRequestToEs: ({ current, update, updateDate, }: {
    current: PluginProperties;
    update: PluginUpdateRequest;
    updateDate?: Date;
}) => PluginProperties;
