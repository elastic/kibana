import type { PackageInfo, RegistryPolicyTemplate } from '../../../../types';
export { promoteFeaturedIntegrations } from './promote_featured_integrations';
export declare const wrapTitleWithDeprecated: ({ title, deprecated, packageInfo, integrationInfo, defaultTitle, }: {
    title?: string;
    deprecated?: boolean;
    packageInfo?: PackageInfo | null;
    integrationInfo?: RegistryPolicyTemplate;
    defaultTitle?: string;
}) => string;
