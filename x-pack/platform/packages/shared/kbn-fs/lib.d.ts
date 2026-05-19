import type { Readable, Writable, StreamOptions } from 'stream';
import type { WriteFileOptions, FileMetadata, WriteFileContent } from './types';
/**
 * Writes data to a file asynchronously, with automatic validation and sanitization.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param content - The content to write. Can be a string, Buffer, TypedArray, Iterable, AsyncIterable, or Stream
 * @param options - Optional configuration
 * @returns Metadata about the written file, including its alias and full path
 *
 * @example
 * ```ts
 * const metadata = await writeFile('report.csv', csvData, {
 *   volume: 'reports',
 * });
 * ```
 */
export declare function writeFile(name: string, content: WriteFileContent, options?: WriteFileOptions): Promise<FileMetadata>;
/**
 * Appends data to a file, creating the file if it does not yet exist.
 * The content is validated and sanitized before appending.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param content - The content to append (string or Uint8Array)
 * @param options - Optional configuration
 * @returns Metadata about the file, including its alias and full path
 *
 * @example
 * ```ts
 * // Appends to: data/logs/debug.log
 * await appendFile('debug.log', 'Debug message\n', { volume: 'logs' });
 * ```
 */
export declare function appendFile(name: string, content: string | Uint8Array, options?: WriteFileOptions): Promise<FileMetadata>;
/**
 * Creates a Writable stream for writing to a file.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param volume - Optional namespace within the data directory to organize files
 * @param options - Stream options (encoding or StreamOptions)
 * @returns A Writable stream that writes to the specified file
 *
 * @example
 * ```ts
 * // Writes to: data/reports/report.csv
 * const stream = createWriteStream('report.csv', 'reports', { encoding: 'utf8' });
 * stream.write(data);
 * stream.end();
 * ```
 */
export declare function createWriteStream(name: string, volume?: string, options?: BufferEncoding | StreamOptions<Writable>): Writable;
/**
 * Reads the entire contents of a file asynchronously.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param volume - Optional namespace within the data directory
 * @returns The file contents as a Buffer (or string if encoding is specified)
 *
 * @example
 * ```ts
 * // Reads from: data/reports/report.csv
 * const report = await readFile('report.csv', 'reports');
 * ```
 */
export declare function readFile(name: string, volume?: string): Promise<string | Buffer>;
/**
 * Creates a Readable stream from a file.
 * Useful for reading large files incrementally without loading everything into memory.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param volume - Optional namespace within the data directory
 * @param options - Stream options (encoding or StreamOptions)
 * @returns A Readable stream that reads from the specified file
 *
 * @example
 * ```ts
 * // Reads from: data/reports/report.csv
 * const stream = createReadStream('report.csv', 'reports', { encoding: 'utf8' });
 * ```
 */
export declare function createReadStream(name: string, volume?: string, options?: BufferEncoding | StreamOptions<Readable>): Readable;
/**
 * Deletes a file asynchronously.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param options - Optional configuration
 *
 * @example
 * ```ts
 * // Deletes: data/reports/old-report.csv
 * await deleteFile('old-report.csv', { volume: 'reports' });
 * ```
 */
export declare function deleteFile(name: string, options?: Pick<WriteFileOptions, 'volume'>): Promise<void>;
/**
 * Writes data to a file synchronously, with automatic validation and sanitization.
 * All files are written to the data directory with path traversal protection.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param content - The content to write (string or ArrayBufferView)
 * @param options - Optional configuration
 * @returns Metadata about the written file, including its alias and full path
 *
 * @example
 * ```ts
 * // Writes to: data/reports/report.csv
 * writeFileSync('report.csv', csvData, { volume: 'reports' });
 * ```
 */
export declare function writeFileSync(name: string, content: string | NodeJS.ArrayBufferView, options?: WriteFileOptions): FileMetadata;
/**
 * Appends data to a file synchronously, creating the file if it does not yet exist.
 * The content is validated and sanitized before appending.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param content - The content to append (string or Uint8Array)
 * @param options - Optional configuration
 * @returns Metadata about the file, including its alias and full path
 *
 * @example
 * ```ts
 * // Appends to: data/logs/debug.log
 * appendFileSync('debug.log', 'Debug message\n', { volume: 'logs' });
 * ```
 */
export declare function appendFileSync(name: string, content: string | Uint8Array, options?: WriteFileOptions): FileMetadata;
/**
 * Reads the entire contents of a file synchronously.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param volume - Optional namespace within the data directory
 * @returns The file contents as a Buffer (or string if encoding is specified)
 *
 * @example
 * ```ts
 * // Reads from: data/reports/report.csv
 * const report = readFileSync('report.csv', 'reports');
 * ```
 */
export declare function readFileSync(name: string, volume?: string): string | Buffer;
/**
 * Deletes a file synchronously.
 *
 * @param name - The filename (relative path within the data directory or volume)
 * @param options - Optional configuration
 *
 * @example
 * ```ts
 * // Deletes: data/reports/old-report.csv
 * deleteFileSync('old-report.csv', { volume: 'reports' });
 * ```
 */
export declare function deleteFileSync(name: string, options?: Pick<WriteFileOptions, 'volume'>): void;
/**
 * Checks if a file exists synchronously.
 *
 * @param path - The file path (relative path within the data directory or volume)
 * @param volume - Optional namespace within the data directory
 * @returns `true` if the file exists, `false` otherwise
 *
 * @example
 * ```ts
 * // File exists at: data/reports/report.csv
 * if (existsSync('report.csv', 'reports')) {
 * }
 * ```
 */
export declare function existsSync(path: string, volume?: string): boolean;
