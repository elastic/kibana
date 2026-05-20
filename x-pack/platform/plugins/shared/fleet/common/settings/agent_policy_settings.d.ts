import { z } from '@kbn/zod/v4';
import type { DocLinks } from '@kbn/doc-links';
import type { SettingsConfig } from './types';
export declare const zodStringWithDurationValidation: z.ZodString;
export declare const zodStringWithYamlValidation: z.ZodString;
export declare const getAgentPolicyAdvancedSettings: (docLinks?: DocLinks["fleet"]) => SettingsConfig[];
