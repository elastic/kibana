import type { z } from '@kbn/zod/v4';
import type { ActionsConfigurationUtilities } from '../../actions_config';
export declare const getAllowedHostsKeysFromShape: (shape: z.ZodRawShape) => string[];
export declare const validateAllowedHostsKeys: (record: Record<string, unknown>, keys: readonly string[], configurationUtilities: ActionsConfigurationUtilities) => void;
