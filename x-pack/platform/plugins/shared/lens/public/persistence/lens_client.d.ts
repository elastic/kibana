import type { HttpStart } from '@kbn/core/public';
import type { Reference } from '@kbn/content-management-utils';
import type { LensSavedObjectAttributes } from '@kbn/lens-common';
import type { LensAttributes, LensItem } from '../../server/content_management';
import { type LensGetResponseBody, type LensSearchRequestQuery } from '../../server';
import type { LensItemMeta, LensUpdateRequestQuery } from '../../server/api/routes/types';
export interface LensItemResponse<M extends Record<string, string | boolean> = {}> {
    item: LensItem;
    meta: LensItemMeta & M;
}
/**
 * This type is to allow `visualizationType` to be `null` in the public context.
 *
 * The stored attributes must have a `visualizationType`.
 */
export type LooseLensAttributes = Omit<LensAttributes, 'visualizationType'> & Pick<LensSavedObjectAttributes, 'visualizationType'>;
export declare class LensClient {
    private http;
    private builder;
    constructor(http: HttpStart);
    get(id: string): Promise<LensItemResponse<LensGetResponseBody['meta']>>;
    create({ description, visualizationType, state, title, version }: LooseLensAttributes, references: Reference[]): Promise<LensItemResponse>;
    update(id: string, { description, visualizationType, state, title, version }: LooseLensAttributes, references: Reference[], options?: LensUpdateRequestQuery): Promise<LensItemResponse>;
    delete(id: string): Promise<{
        success: boolean;
    }>;
    search({ query, page, perPage, fields, searchFields, }: LensSearchRequestQuery): Promise<LensItem[]>;
}
