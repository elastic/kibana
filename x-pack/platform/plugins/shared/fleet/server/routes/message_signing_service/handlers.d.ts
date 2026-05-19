import type { TypeOf } from '@kbn/config-schema';
import type { FleetRequestHandler } from '../../types';
import type { RotateKeyPairSchema } from '../../types/rest_spec/message_signing_service';
export declare const rotateKeyPairHandler: FleetRequestHandler<undefined, TypeOf<typeof RotateKeyPairSchema.query>, undefined>;
