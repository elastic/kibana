import type { SavedObjectReference } from '@kbn/core/server';
export declare class ConnectorReferenceHandler {
    private newReferences;
    constructor(references: Array<{
        id?: string | null;
        name: string;
        type: string;
    }>);
    /**
     * Merges the references passed to the constructor into the original references passed into this function
     *
     * @param originalReferences existing saved object references
     * @returns a merged reference list or undefined when there are no new or existing references
     */
    build(originalReferences?: SavedObjectReference[]): SavedObjectReference[] | undefined;
}
