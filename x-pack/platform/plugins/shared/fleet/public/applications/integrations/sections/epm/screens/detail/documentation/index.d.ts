import React from 'react';
import type { PackageInfo } from '../../../../../types';
interface Props {
    packageInfo: PackageInfo;
    integration?: string | null;
}
export declare const hasDocumentation: ({ packageInfo, integration }: Props) => true | undefined;
export declare const DocumentationPage: React.FunctionComponent<Props>;
export {};
