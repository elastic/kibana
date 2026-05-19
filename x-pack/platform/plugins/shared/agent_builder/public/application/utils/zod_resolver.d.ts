import { z } from '@kbn/zod/v4';
import type { FieldValues, Resolver } from 'react-hook-form';
export declare const zodResolver: <T extends FieldValues>(schema: z.ZodType) => Resolver<T>;
