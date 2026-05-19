import React from 'react';
import type { Cluster } from '../../../../../../../common/lib';
export declare const i18nTexts: {
    urlEmpty: React.JSX.Element;
    urlInvalid: React.JSX.Element;
};
export declare const isCloudAdvancedOptionsEnabled: (cluster?: Cluster) => boolean;
export declare const convertCloudRemoteAddressToProxyConnection: (url: string) => {
    proxyAddress: string;
    serverName: string | undefined;
};
export declare const validateCloudRemoteAddress: (url?: string) => JSX.Element | null;
