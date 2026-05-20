import React from 'react';
import type { CaseSeverity } from '../../../common/types/domain';
interface Props {
    selectedSeverity: CaseSeverity;
    onSeverityChange: (status: CaseSeverity) => void;
    isLoading: boolean;
    isDisabled: boolean;
}
export declare const SeveritySelector: React.FC<Props>;
export {};
