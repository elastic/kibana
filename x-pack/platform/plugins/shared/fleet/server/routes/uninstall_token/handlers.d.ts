import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler } from '../../types';
import type { GetUninstallTokensMetadataRequestSchema, GetUninstallTokenRequestSchema } from '../../types/rest_spec/uninstall_token';
export declare const getUninstallTokensMetadataHandler: FleetRequestHandler<unknown, TypeOf<typeof GetUninstallTokensMetadataRequestSchema.query>>;
export declare const getUninstallTokenHandler: FleetRequestHandler<TypeOf<typeof GetUninstallTokenRequestSchema.params>>;
