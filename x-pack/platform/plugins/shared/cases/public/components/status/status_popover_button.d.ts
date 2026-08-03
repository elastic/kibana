import React from 'react';
import type { CaseStatuses } from '@kbn/cases-components/src/status/types';
interface Props {
    disabled?: boolean;
    status: CaseStatuses;
    onClick: () => void;
}
export declare const StatusPopoverButton: React.NamedExoticComponent<Props>;
export {};
