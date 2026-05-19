import type { HttpStart } from '@kbn/core/public';
import type { LensDocument, ILensDocumentService } from '@kbn/lens-common';
import type { LensSearchRequestQuery } from '../../server';
interface LensSaveResult {
    savedObjectId: string;
}
export declare class LensDocumentService implements ILensDocumentService {
    private client;
    constructor(http: HttpStart);
    save: (vis: LensDocument) => Promise<LensSaveResult>;
    load(savedObjectId: string): Promise<import("./lens_client").LensItemResponse<Readonly<{
        originId?: string | undefined;
        managed?: boolean | undefined;
        createdBy?: string | undefined;
        updatedAt?: string | undefined;
        createdAt?: string | undefined;
        updatedBy?: string | undefined;
        aliasTargetId?: string | undefined;
        aliasPurpose?: "savedObjectConversion" | "savedObjectImport" | undefined;
    } & {
        type: string;
        outcome: "conflict" | "exactMatch" | "aliasMatch";
    }>>>;
    search(options: LensSearchRequestQuery): Promise<Readonly<{
        state?: any;
        version?: 2 | undefined;
        description?: string | undefined;
    } & {
        id: string;
        title: string;
        references: Readonly<{} & {
            name: string;
            id: string;
            type: string;
        }>[];
        visualizationType: string;
    }>[]>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
}
export {};
