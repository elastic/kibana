import React from 'react';
import type { PackageInfo } from '../../../../common';
import type { CloudConnectorField } from '../types';
export declare const CloudConnectorInputFields: ({ fields, onChange, packageInfo, hasInvalidRequiredVars, }: {
    fields: Array<CloudConnectorField>;
    onChange: (key: string, value: string) => void;
    packageInfo: PackageInfo;
    hasInvalidRequiredVars?: boolean;
}) => React.JSX.Element;
