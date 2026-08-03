import type { FunctionComponent } from 'react';
export interface ApiKeyBadgeProps {
    type: 'rest' | 'cross_cluster' | 'managed';
}
export declare const ApiKeyBadge: FunctionComponent<ApiKeyBadgeProps>;
