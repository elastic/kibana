import type { SavedObject } from '@kbn/core/server';
import { KibanaSavedObjectType } from '../../../../common/types';
import type { AssetType, Installable, Installation } from '../../../types';
export { bulkInstallPackages, isBulkInstallError } from './bulk_install_packages';
export { getCategories, getFile, getInstallationObject, getInstallation, getInstallations, getPackageInfo, getPackages, getInstalledPackages, getLimitedPackages, getPackageKnowledgeBase, } from './get';
export { getBundledPackages } from './bundled_packages';
export { getBulkAssets } from './get_bulk_assets';
export { getTemplateInputs } from './get_template_inputs';
export type { BulkInstallResponse, IBulkInstallPackageError } from './install';
export { handleInstallPackageFailure, installPackage, ensureInstalledPackage } from './install';
export { reinstallPackageForInstallation } from './reinstall';
export { removeInstallation } from './remove';
export { updateCustomIntegration, incrementVersionAndUpdate } from './update_custom_integration';
export { handleNamespaceTemplateRestoreAfterPackageInstall, insertNamespaceCustomTemplate, isNamespaceCustomizationEnabledForPackage, syncNamespaceTemplates, } from './namespace_datastream_templates';
export type { SyncNamespaceTemplatesSummary } from './namespace_datastream_templates';
export declare class PackageNotInstalledError extends Error {
    constructor(pkgkey: string);
}
export declare const savedObjectTypes: AssetType[];
export declare const kibanaSavedObjectTypes: KibanaSavedObjectType[];
export declare function createInstallableFrom<T>(from: T, savedObject?: SavedObject<Installation>): Installable<T>;
