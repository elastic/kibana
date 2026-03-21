import React from 'react';
import type { ApplicationStart, Capabilities } from '@kbn/core/public';
interface Props {
    isDisabled?: boolean;
    size?: 's' | 'm';
    fullWidth?: boolean;
    onClick?: () => void;
    capabilities: Capabilities;
    navigateToApp: ApplicationStart['navigateToApp'];
}
export declare const ManageSpacesButton: React.FC<Props>;
export {};
