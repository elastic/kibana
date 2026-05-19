import React from 'react';
import type { ErrorMessage } from '../use_push_to_service/callout/types';
interface PushCalloutsProps {
    hasConnectors: boolean;
    hasLicenseError: boolean;
    errorsMsg: ErrorMessage[];
    onEditClick: () => void;
}
export declare const PushCallouts: React.NamedExoticComponent<PushCalloutsProps>;
export {};
