import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
import type { Direction } from '@elastic/eui';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common/types';
declare const SORTABLE_FIELDS: readonly ["nameSortKey", "retentionMs"];
export type SortableField = (typeof SORTABLE_FIELDS)[number];
export interface EnrichedStream extends ListStreamDetail {
    nameSortKey: string;
    documentsCount: number;
    retentionMs: number;
    type: 'wired' | 'root' | 'classic';
    children?: EnrichedStream[];
}
export type TableRow = EnrichedStream & {
    level: number;
    rootNameSortKey: string;
    rootDocumentsCount: number;
    rootRetentionMs: number;
    dataQuality: QualityIndicators;
};
export interface StreamTree extends ListStreamDetail {
    children: StreamTree[];
}
export declare function shouldComposeTree(sortField: SortableField): sortField is "nameSortKey";
export declare function filterStreamsByQuery(streams: ListStreamDetail[], query: string): ListStreamDetail[];
export declare function filterCollapsedStreamRows(rows: TableRow[], collapsedStreams: Set<string>, sortField: SortableField): TableRow[];
export declare function buildStreamRows(enrichedStreams: EnrichedStream[], sortField: SortableField, sortDirection: Direction, qualityByStream: Record<string, QualityIndicators>): TableRow[];
export declare function asTrees(streams: ListStreamDetail[]): StreamTree[];
export declare const enrichStream: (node: StreamTree | ListStreamDetail) => EnrichedStream;
export declare const getLegacyLogsStatus: (streamsStatus: WiredStreamsStatus | undefined) => {
    hasLegacyLogs: boolean;
    hasNewStreams: boolean;
};
export {};
