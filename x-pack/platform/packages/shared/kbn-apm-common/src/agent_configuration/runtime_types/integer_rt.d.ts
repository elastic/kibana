import { z } from '@kbn/zod/v4';
export declare function getIntegerSchema({ min, max, }?: {
    min?: number;
    max?: number;
}): z.ZodString;
