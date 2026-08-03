import React from 'react';
import type { AppHeaderBadge } from '@kbn/app-header';
import { CaseSeverity } from '../../../common/types/domain';
interface SeverityConfig {
    label: string;
    badgeColor: NonNullable<AppHeaderBadge['color']>;
}
interface Props {
    severity: CaseSeverity;
}
export declare const severities: Record<CaseSeverity, SeverityConfig>;
export declare const SeverityHealth: React.FC<Props>;
export {};
