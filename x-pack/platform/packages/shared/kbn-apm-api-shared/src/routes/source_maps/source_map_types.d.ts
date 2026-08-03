import { z } from '@kbn/zod/v4';
export declare const sourceMapSchema: z.ZodObject<{
    version: z.ZodNumber;
    sources: z.ZodArray<z.ZodString>;
    mappings: z.ZodString;
    names: z.ZodOptional<z.ZodArray<z.ZodString>>;
    file: z.ZodOptional<z.ZodString>;
    sourceRoot: z.ZodOptional<z.ZodString>;
    sourcesContent: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNull]>>>;
}, z.core.$strip>;
export type SourceMap = z.infer<typeof sourceMapSchema>;
export interface ApmSourceMapArtifactBody {
    serviceName: string;
    serviceVersion: string;
    bundleFilepath: string;
    sourceMap: SourceMap;
}
