import type { Logger } from '@kbn/core/server';
import type { File } from '@kbn/files-plugin/common';
import type { CasesClientArgs } from '../types';
import type { BulkDeleteFileArgs } from './types';
import type { CasesClient } from '../client';
export declare const bulkDeleteFileAttachments: ({ caseId, fileIds }: BulkDeleteFileArgs, clientArgs: CasesClientArgs, casesClient: CasesClient) => Promise<void>;
export declare const retrieveFilesIgnoringNotFound: (results: Array<File<unknown> | Error>, fileIds: BulkDeleteFileArgs["fileIds"], logger: Logger) => File<unknown>[];
