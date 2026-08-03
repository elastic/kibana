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
        managed?: boolean | undefined;
        originId?: string | undefined;
        aliasPurpose?: "savedObjectConversion" | "savedObjectImport" | undefined;
        createdAt?: string | undefined;
        updatedAt?: string | undefined;
        createdBy?: string | undefined;
        updatedBy?: string | undefined;
        aliasTargetId?: string | undefined;
    } & {
        type: string;
        outcome: "conflict" | "exactMatch" | "aliasMatch";
    }>>>;
    search(options: LensSearchRequestQuery): Promise<Readonly<{
        state?: any;
        description?: string | undefined;
        version?: 2 | undefined;
    } & {
        id: string;
        title: string;
        references: Readonly<{
            id: string;
            type: string;
            name: string;
        }>[];
        visualizationType: string;
    }>[]>;
    hasLibraryItemWithTitle: (title: string) => Promise<boolean>;
}
export {};
