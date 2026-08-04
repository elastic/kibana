import type { EpisodesSortState } from '@kbn/alerting-v2-episodes-ui/queries/episodes_query';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
/**
 * Persists episode table display options (columns, sort, row height, column widths) to both
 * the URL (`_a.episodesTable`) and localStorage, so they survive reloads and are shareable via URL.
 *
 * Precedence on load (and on re-sync from browser Back/Forward): URL > localStorage > default.
 * Every setter writes to both stores, so the two stay in sync going forward.
 */
export declare const useEpisodesTableConfig: (storage: Storage) => {
    visibleColumns: string[];
    sort: {
        sortField: string;
        sortDirection: "asc" | "desc";
    };
    rowHeight: number;
    columnSettings: Record<string, {
        width?: number | undefined;
        display?: string | undefined;
    }>;
    setVisibleColumns: (visibleColumns: string[]) => void;
    setSort: (sort: EpisodesSortState) => void;
    setRowHeight: (rowHeight: number) => void;
    onResize: ({ columnId, width }: {
        columnId: string;
        width: number | undefined;
    }) => void;
    resetToDefaults: () => void;
};
