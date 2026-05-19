import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';
import type { GetRemoteSyncedIntegrationsInfoRequestSchema } from '../../types';
export declare const getRemoteSyncedIntegrationsStatusHandler: RequestHandler<undefined>;
export declare const getRemoteSyncedIntegrationsInfoHandler: RequestHandler<TypeOf<typeof GetRemoteSyncedIntegrationsInfoRequestSchema.params>>;
