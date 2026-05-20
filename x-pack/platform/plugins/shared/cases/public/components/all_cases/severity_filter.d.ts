import React from 'react';
import type { CaseSeverity } from '../../../common/types/domain';
interface Props {
    selectedOptionKeys: CaseSeverity[];
    onChange: (params: {
        filterId: string;
        selectedOptionKeys: string[];
    }) => void;
}
export declare const SeverityFilter: React.FC<Props>;
export {};
