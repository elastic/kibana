import type { SavedObjectsFindOptions, SavedObjectsFindResult, SavedObject, SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { CaseIdIncrementerPersistedAttributes, CaseIdIncrementerSavedObject } from '../../common/types/id_incrementer';
type GetCasesParameters = Pick<SavedObjectsFindOptions, 'sortField' | 'sortOrder' | 'perPage' | 'page' | 'filter' | 'namespaces'>;
export declare class CasesIncrementalIdService {
    private internalSavedObjectsClient;
    private logger;
    static incrementalIdExistsFilter: import("@kbn/es-query").KueryNode;
    static incrementalIdMissingFilter: import("@kbn/es-query").KueryNode;
    private isStopped;
    constructor(internalSavedObjectsClient: SavedObjectsClientContract, logger: Logger);
    stopService(): void;
    startService(): void;
    getCasesWithoutIncrementalId(parameters?: Omit<GetCasesParameters, 'filter'>): Promise<import("@kbn/core/server").SavedObjectsFindResponse<CasePersistedAttributes, unknown>>;
    getCases({ filter, perPage, page, sortOrder, sortField, namespaces, }: GetCasesParameters): Promise<import("@kbn/core/server").SavedObjectsFindResponse<CasePersistedAttributes, unknown>>;
    /**
     * Get the latest applied ID for a given space.
     * Uses the actually applied numerical ids on cases in the space.
     */
    getLastAppliedIdForSpace(namespace: string): Promise<number>;
    /**
     * Increments the case ids for the given cases.
     * @param casesWithoutIncrementalId The cases we want to apply IDs to
     * @returns The amount of processed cases.
     */
    incrementCaseIds(casesWithoutIncrementalId: Array<SavedObjectsFindResult<CasePersistedAttributes>>): Promise<number>;
    getCaseIdIncrementerSo(namespace: string): Promise<import("@kbn/core/server").SavedObjectsFindResponse<CaseIdIncrementerPersistedAttributes, unknown>>;
    /**
     * Gets or creates the case id incrementer SO for the given namespace
     * @param namespace The namespace of the case id incrementor so
     */
    getOrCreateCaseIdIncrementerSo(namespace: string): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>>;
    /**
     * Resolves the situation when multiple incrementer SOs exists
     */
    resolveMultipleIncrementerSO(incrementerQueryResponse: Array<SavedObjectsFindResult<CaseIdIncrementerPersistedAttributes>>, latestAppliedId: number, namespace: string): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>>;
    /**
     * Creates a case id incrementer SO for the given namespace
     * @param namespace The namespace for the newly created case id incrementer SO
     */
    createCaseIdIncrementerSo(namespace: string, lastId?: number): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>>;
    incrementCounterSO(incrementerSo: CaseIdIncrementerSavedObject, lastAppliedId: number, namespace: string): Promise<SavedObject<CaseIdIncrementerPersistedAttributes>>;
    applyIncrementalIdToCaseSo(currentCaseSo: SavedObjectsFindResult<CasePersistedAttributes>, newIncrementalId: number | null, namespace: string): Promise<void>;
}
export {};
