import React from 'react';
import type { EuiButtonEmptyProps } from '@elastic/eui';
interface DevtoolsRequestFlyoutButtonProps {
    title?: string;
    description?: string;
    isDisabled?: boolean;
    request: string;
    btnProps?: EuiButtonEmptyProps;
}
export declare const DevtoolsRequestFlyoutButton: React.FunctionComponent<DevtoolsRequestFlyoutButtonProps>;
export interface ApiRequestFlyoutProps {
    title?: string;
    description?: string;
    isDisabled?: string;
    request: string;
    closeFlyout: () => void;
}
export declare const ApiRequestFlyout: React.FunctionComponent<ApiRequestFlyoutProps>;
export {};
