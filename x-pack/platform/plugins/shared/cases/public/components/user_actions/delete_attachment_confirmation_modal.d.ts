import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
type Props = Pick<EuiConfirmModalProps, 'title' | 'confirmButtonText' | 'onConfirm' | 'onCancel'> & {
    /**
     * The ref of the button to focus when the modal is closed
     */
    focusButtonRef?: React.Ref<HTMLButtonElement | HTMLAnchorElement>;
};
export declare const DeleteAttachmentConfirmationModal: React.NamedExoticComponent<Props>;
export {};
