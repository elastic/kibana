import type { TypeOf } from '@kbn/config-schema';
import type { PreconfiguredSpaceSettingsSchema } from '../../types';
export declare function ensureSpaceSettings(configSpaceSettingsArray: TypeOf<typeof PreconfiguredSpaceSettingsSchema>): Promise<void>;
