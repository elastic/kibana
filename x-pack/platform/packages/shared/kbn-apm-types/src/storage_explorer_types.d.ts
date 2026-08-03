import { z } from '@kbn/zod/v4';
import { IndexLifecyclePhaseSelectOption } from './ilm_types';
export declare const indexLifecyclePhaseSchema: z.ZodObject<{
    indexLifecyclePhase: z.ZodUnion<readonly [z.ZodLiteral<IndexLifecyclePhaseSelectOption.All>, z.ZodLiteral<IndexLifecyclePhaseSelectOption.Hot>, z.ZodLiteral<IndexLifecyclePhaseSelectOption.Warm>, z.ZodLiteral<IndexLifecyclePhaseSelectOption.Cold>, z.ZodLiteral<IndexLifecyclePhaseSelectOption.Frozen>]>;
}, z.core.$strip>;
