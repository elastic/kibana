import type { ESQLAstCommand } from '@elastic/esql/types';
import type { RenameProcessor } from '../../../../types/processors';
/**
 * Converts a Streamlang RenameProcessor into a list of ES|QL AST commands.
 *
 * Filters applied for Ingest Pipeline parity:
 * - When `ignore_missing: false`: `WHERE NOT(source_field IS NULL)` filters missing source fields
 * - When `override: false`: `WHERE target_field IS NULL` filters existing target fields
 *
 * Ingest Pipeline throws errors ("field doesn't exist" / "field already exists"),
 * while ES|QL uses filtering to exclude such documents entirely.
 */
export declare function convertRenameProcessorToESQL(processor: RenameProcessor): ESQLAstCommand[];
