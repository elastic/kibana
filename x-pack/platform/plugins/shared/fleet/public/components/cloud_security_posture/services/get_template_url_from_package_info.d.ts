import type { PackageInfo } from '../../../types';
export declare const SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS: {
    CLOUD_FORMATION: string;
    CLOUD_FORMATION_CREDENTIALS: string;
    ARM_TEMPLATE: string;
    CLOUD_SHELL_URL: string;
};
export declare const getTemplateUrlFromPackageInfo: (packageInfo: PackageInfo | undefined, integrationType: string, templateUrlFieldName: string) => string | undefined;
