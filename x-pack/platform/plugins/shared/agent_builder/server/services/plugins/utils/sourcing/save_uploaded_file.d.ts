import type { Readable } from 'stream';
/**
 * Saves an uploaded file stream to a temporary location in the Kibana data folder.
 *
 * Returns the full path to the saved file and a cleanup function
 * that removes the temporary file when called.
 */
export declare const saveUploadedFile: (stream: Readable) => Promise<{
    filePath: string;
    cleanup: () => Promise<void>;
}>;
