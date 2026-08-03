import type { Query, TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
interface UseVisPreviewUnifiedSearchResult {
    searchBarProps: StatefulSearchBarProps<Query>;
    effectiveTimeRange: TimeRange;
    onBrushEnd: NonNullable<TypedLensByValueInput['onBrushEnd']>;
}
/**
 * Local time-range state for an inline visualization (Lens or Vega) + unified
 * SearchBar preview, driven by the visualization's initial `timeRange` and
 * `StatefulSearchBarProps` `dateRangeFrom` / `dateRangeTo`.
 */
export declare const useVisPreviewUnifiedSearch: ({ timeRange, }: {
    timeRange: TimeRange | undefined;
}) => UseVisPreviewUnifiedSearchResult;
export {};
