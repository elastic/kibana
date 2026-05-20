import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { GetOneDownloadSourcesRequestSchema, PutDownloadSourcesRequestSchema, PostDownloadSourcesRequestSchema, DeleteDownloadSourcesRequestSchema } from '../../types';
import type { DownloadSource } from '../../../common/types';
export type DownloadSourceWithNullableAuth = Partial<DownloadSource> & {
    auth?: DownloadSource['auth'] | null;
};
/**
 * Validates download source auth configuration.
 *
 * Allowed auth configurations:
 * - auth headers only (no credentials)
 * - username + password (together), optionally with headers (no api_key)
 * - api_key, optionally with headers (no username/password)
 * - auth: null (to clear all auth data)
 * - auth: undefined (no changes to auth)
 */
export declare function validateDownloadSource(downloadSource: DownloadSourceWithNullableAuth): void;
export declare const getDownloadSourcesHandler: RequestHandler;
export declare const getOneDownloadSourcesHandler: RequestHandler<TypeOf<typeof GetOneDownloadSourcesRequestSchema.params>>;
export declare const putDownloadSourcesHandler: RequestHandler<TypeOf<typeof PutDownloadSourcesRequestSchema.params>, undefined, TypeOf<typeof PutDownloadSourcesRequestSchema.body>>;
export declare const postDownloadSourcesHandler: RequestHandler<undefined, undefined, TypeOf<typeof PostDownloadSourcesRequestSchema.body>>;
export declare const deleteDownloadSourcesHandler: RequestHandler<TypeOf<typeof DeleteDownloadSourcesRequestSchema.params>>;
