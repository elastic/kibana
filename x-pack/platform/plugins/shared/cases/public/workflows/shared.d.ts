import type { z } from '@kbn/zod/v4';
import { type PublicStepDefinition } from '@kbn/workflows-extensions/public';
export declare function createPublicCaseStepDefinition<Input extends z.ZodType = z.ZodType, Output extends z.ZodType = z.ZodType, Config extends z.ZodObject = z.ZodObject>(definition: PublicStepDefinition<Input, Output, Config>): PublicStepDefinition<Input, Output, Config>;
