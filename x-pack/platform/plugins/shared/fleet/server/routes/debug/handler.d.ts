import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler } from '../../types';
import type { FetchIndexRequestSchema, FetchSavedObjectNamesRequestSchema, FetchSavedObjectsRequestSchema } from '../../types/rest_spec/debug';
export declare const fetchIndexHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof FetchIndexRequestSchema.body>>;
export declare const fetchSavedObjectsHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof FetchSavedObjectsRequestSchema.body>>;
export declare const fetchSavedObjectNamesHandler: FleetRequestHandler<undefined, undefined, TypeOf<typeof FetchSavedObjectNamesRequestSchema.body>>;
