import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler, PutSettingsRequestSchema, PutSpaceSettingsRequestSchema } from '../../types';
export declare const getSpaceSettingsHandler: FleetRequestHandler;
export declare const putSpaceSettingsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof PutSpaceSettingsRequestSchema.body>>;
export declare const getSettingsHandler: FleetRequestHandler;
export declare const putSettingsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof PutSettingsRequestSchema.body>>;
