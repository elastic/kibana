import React from 'react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
export interface ActionPolicyDefinitionListProps {
    policy: Partial<ActionPolicyResponse>;
}
export declare const ActionPolicyDefinitionList: ({ policy }: ActionPolicyDefinitionListProps) => React.JSX.Element;
