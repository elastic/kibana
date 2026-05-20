import type { FileJSON } from '@kbn/files-plugin/common';
import type { FileServiceStart } from '@kbn/files-plugin/server';
import type { OwnerEntity } from '../../authorization';
type FileEntityInfo = Pick<FileJSON, 'fileKind' | 'id'>;
export declare const createFileEntities: (files: FileEntityInfo[]) => OwnerEntity[];
export declare const deleteFiles: (fileIds: string[], fileService: FileServiceStart) => Promise<void[] | undefined>;
export {};
