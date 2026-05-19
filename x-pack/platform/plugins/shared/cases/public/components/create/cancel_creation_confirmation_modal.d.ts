import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
type Props = Pick<EuiConfirmModalProps, 'title' | 'confirmButtonText' | 'cancelButtonText' | 'onConfirm' | 'onCancel'>;
export declare const CancelCreationConfirmationModal: React.NamedExoticComponent<Props>;
export {};
