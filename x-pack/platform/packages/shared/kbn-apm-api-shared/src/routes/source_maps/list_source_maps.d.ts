import { z } from '@kbn/zod/v4';
import type { ApmSourceMapArtifactBody } from './source_map_types';
export interface ListSourceMapArtifactsResponse {
    artifacts: Array<{
        body: ApmSourceMapArtifactBody;
        id: string;
        created: string;
        compressionAlgorithm: 'none' | 'zlib';
        encryptionAlgorithm: 'none';
        decodedSha256: string;
        decodedSize: number;
        encodedSha256: string;
        encodedSize: number;
        identifier: string;
        packageName: string;
        relative_url: string;
        type?: string | undefined;
    }>;
    total: number;
}
export declare const listSourceMapsRoute: {
    endpoint: "GET /api/apm/sourcemaps 2023-10-31";
    params?: z.ZodObject<{
        query: z.ZodOptional<z.ZodObject<{
            page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
            perPage: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        }, z.core.$strip>>;
    }, z.core.$strip> | undefined;
} & import("../types").WithResponse<ListSourceMapArtifactsResponse | undefined>;
