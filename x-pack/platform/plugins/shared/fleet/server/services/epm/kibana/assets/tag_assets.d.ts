import type { SavedObjectsImportSuccess } from '@kbn/core-saved-objects-common';
import type { IAssignmentService } from '@kbn/saved-objects-tagging-plugin/server';
import type { ITagsClient } from '@kbn/saved-objects-tagging-plugin/common/types';
import type { PackageSpecTags } from '../../../../types';
export declare const getPackageSpecTagId: (spaceId: string, pkgName: string, tagName: string) => string;
interface TagAssetsParams {
    savedObjectTagAssignmentService: IAssignmentService;
    savedObjectTagClient: ITagsClient;
    pkgTitle: string;
    pkgName: string;
    spaceId: string;
    importedAssets: SavedObjectsImportSuccess[];
    assetTags?: PackageSpecTags[];
}
export declare function tagKibanaAssets(opts: TagAssetsParams): Promise<void>;
export {};
