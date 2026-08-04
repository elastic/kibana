import React from 'react';
import type { CaseSeverity } from '../../../../../../common';
interface Props {
    selectedSeverity: CaseSeverity;
    onSeverityChange: (severity: CaseSeverity) => void;
    isLoading: boolean;
    isDisabled: boolean;
}
export declare const SeverityField: React.FC<Props>;
export {};
