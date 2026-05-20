import type { TypeOf } from '@kbn/config-schema';
import type { DeletePackageDatastreamAssetsRequestSchema, FleetRequestHandler } from '../../types';
export declare const deletePackageDatastreamAssetsHandler: FleetRequestHandler<TypeOf<typeof DeletePackageDatastreamAssetsRequestSchema.params>, TypeOf<typeof DeletePackageDatastreamAssetsRequestSchema.query>>;
