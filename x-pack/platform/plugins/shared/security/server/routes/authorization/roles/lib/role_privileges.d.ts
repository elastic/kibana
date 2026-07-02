import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { RolePayloadSchemaType } from '../model/put_payload';
export declare const roleGrantsSubFeaturePrivileges: (features: KibanaFeature[], role: RolePayloadSchemaType) => boolean;
