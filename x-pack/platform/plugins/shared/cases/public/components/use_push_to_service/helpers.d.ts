import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
import type { ActionLicense } from '../../containers/types';
import type { ErrorMessage } from './callout/types';
export declare const getLicenseError: (docLinks: DocLinksStart) => {
    id: string;
    title: string;
    description: React.JSX.Element;
};
export declare const getKibanaConfigError: (docLinks: DocLinksStart) => {
    id: string;
    title: string;
    description: React.JSX.Element;
};
export declare const getActionLicenseError: (actionLicense: ActionLicense | null, docLinks: DocLinksStart) => ErrorMessage[];
export declare const getConnectorMissingInfo: () => {
    id: string;
    title: string;
    description: string;
};
export declare const getDeletedConnectorError: (docLinks: DocLinksStart) => {
    id: string;
    title: string;
    description: React.JSX.Element;
    errorType: string;
};
export declare const getCaseClosedInfo: () => {
    id: string;
    title: string;
    description: React.JSX.Element;
};
