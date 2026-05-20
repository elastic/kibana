import React from 'react';
import type { FleetAuthz } from '../../../../../../../../common';
export declare const DEFERRED_ASSETS_WARNING_LABEL: string;
export declare const DEFERRED_ASSETS_WARNING_MSG: string;
export declare const getDeferredInstallationMsg: (numOfDeferredInstallations: number | undefined | null, { authz }: {
    authz: FleetAuthz;
}) => string;
export declare const DeferredAssetsWarning: ({ numOfDeferredInstallations, }: {
    numOfDeferredInstallations?: number;
}) => React.JSX.Element;
