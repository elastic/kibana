import React from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
export interface CloseReasonOption {
    key?: string;
}
export interface CloseCaseModalProps {
    closeReasonOptions: Array<EuiSelectableOption<CloseReasonOption>>;
    onClose: () => void;
    onSubmit: () => void;
    onCloseReasonOptionsChange: (options: Array<EuiSelectableOption<CloseReasonOption>>, event?: unknown, changedOption?: EuiSelectableOption<CloseReasonOption>) => void;
}
export declare const CloseCaseModal: React.NamedExoticComponent<CloseCaseModalProps>;
