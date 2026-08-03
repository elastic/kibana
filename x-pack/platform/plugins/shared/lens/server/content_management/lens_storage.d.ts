import type { Logger } from '@kbn/logging';
import type { StorageContext } from '@kbn/content-management-plugin/server';
import { SOContentStorage } from '@kbn/content-management-utils';
import type { LensGetOut, LensSearchIn, LensUpdateIn, LensUpdateOut, LensCrud, LensCreateOut, LensSearchOut, LensCreateIn } from './latest';
export declare class LensStorage extends SOContentStorage<LensCrud> {
    constructor(params: {
        logger: Logger;
        throwOnResultValidationError: boolean;
    });
    get(ctx: StorageContext, id: string): Promise<LensGetOut>;
    create(ctx: StorageContext, data: LensCreateIn['data'], options?: LensCreateIn['options']): Promise<LensCreateOut>;
    update(ctx: StorageContext, id: string, data: LensUpdateIn['data'], options: LensUpdateIn['options']): Promise<LensUpdateOut>;
    search(ctx: StorageContext, query: LensSearchIn['query'], options?: LensSearchIn['options']): Promise<LensSearchOut>;
}
