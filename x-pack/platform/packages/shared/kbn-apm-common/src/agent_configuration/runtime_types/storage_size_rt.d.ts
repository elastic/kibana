import { z } from '@kbn/zod/v4';
export declare function getStorageSizeSchema({ min, max }: {
    min?: string;
    max?: string;
}): z.ZodString;
