import type { NotificationsStart } from '@kbn/core/public';
export declare function applyNamespaceCustomizationChange(pkgName: string, pkgVersion: string, namespace: string | undefined, desiredEnabled: boolean, installedEnabledFor: string[], notifications: NotificationsStart, packageTitle: string): Promise<void>;
