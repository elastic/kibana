import { z } from '@kbn/zod/v4';
export declare const logEcsReformattingSchema: z.ZodEnum<{
    replace: "replace";
    override: "override";
    off: "off";
    shade: "shade";
}>;
