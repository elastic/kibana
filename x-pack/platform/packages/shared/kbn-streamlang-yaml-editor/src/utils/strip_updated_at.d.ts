import type { StreamlangDSL } from '@kbn/streamlang/types/streamlang';
/**
 * Strips the updated_at field from the DSL.
 * This server-managed timestamp should not be displayed in the editor.
 */
export declare function stripUpdatedAt(dsl: StreamlangDSL): StreamlangDSL;
