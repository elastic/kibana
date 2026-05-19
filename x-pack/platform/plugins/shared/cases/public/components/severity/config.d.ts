import React from 'react';
import { CaseSeverity } from '../../../common/types/domain';
interface Props {
    severity: CaseSeverity;
}
export declare const severities: {
    low: {
        label: string;
    };
    medium: {
        label: string;
    };
    high: {
        label: string;
    };
    critical: {
        label: string;
    };
};
export declare const SeverityHealth: React.FC<Props>;
export {};
