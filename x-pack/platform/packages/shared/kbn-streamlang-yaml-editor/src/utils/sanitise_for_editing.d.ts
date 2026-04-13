import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
/**
 * Sanitises the DSL for display in the editor by removing internal/server-managed fields.
 * Strips:
 * - customIdentifier from all steps (internal tracking IDs)
 * - updated_at from the DSL root (server-managed timestamp)
 */
export declare const sanitiseForEditing: (dsl: StreamlangDSL) => StreamlangDSL;
