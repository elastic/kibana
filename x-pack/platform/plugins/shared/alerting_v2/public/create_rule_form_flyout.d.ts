import React from 'react';
import type { ESQLControlVariable } from '@kbn/esql-types';
export interface CreateRuleFormFlyoutProps {
    query: string;
    onClose?: () => void;
    push?: boolean;
    esqlVariables?: ESQLControlVariable[];
    validationErrors?: string[];
    /** Whether to include the Form/YAML edit mode toggle (default: true) */
    includeYaml?: boolean;
}
export declare const DynamicRuleFormFlyout: ({ includeYaml, ...props }: CreateRuleFormFlyoutProps) => React.JSX.Element;
