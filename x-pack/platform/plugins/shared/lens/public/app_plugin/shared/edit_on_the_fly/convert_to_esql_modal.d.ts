import React from 'react';
import type { EuiConfirmModalProps } from '@elastic/eui';
import type { ConvertibleLayer } from './esql_conversion_types';
export declare const ConvertToEsqlModal: React.FunctionComponent<{
    layers: ConvertibleLayer[];
    onCancel: EuiConfirmModalProps['onCancel'];
    /**
     * Callback invoked when user confirms the conversion.
     */
    onConfirm: () => void;
}>;
