import type React from 'react';
import type { z } from '@kbn/zod/v4';
export type SettingsSection = 'AGENT_POLICY_ADVANCED_SETTINGS';
/**
 * Those dependencies are used to not require dependencies not used server side
 */
export interface SettingsUIDependencies {
    renderer: {
        renderCode: (code: string) => React.ReactNode;
    };
}
export interface SettingsConfig {
    name: string;
    title: string;
    description: (deps: SettingsUIDependencies) => string | React.ReactNode;
    learnMoreLink?: string;
    schema: z.ZodTypeAny;
    api_field: {
        name: string;
    };
    hidden?: boolean;
    options?: Array<{
        value: string;
        text: string;
    }>;
    example_value?: string | number | boolean;
    type?: 'yaml';
    /** Custom label for boolean checkbox (default: "Enable") */
    checkboxLabel?: string;
}
