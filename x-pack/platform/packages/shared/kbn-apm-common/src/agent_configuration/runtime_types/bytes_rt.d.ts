import { z } from '@kbn/zod/v4';
export declare function getBytesSchema({ min, max }: {
    min?: string;
    max?: string;
}): z.ZodString;
