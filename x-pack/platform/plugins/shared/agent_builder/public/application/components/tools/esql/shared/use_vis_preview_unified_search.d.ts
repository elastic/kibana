import type { Query, TimeRange } from '@kbn/es-query';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
interface UseVisPreviewUnifiedSearchResult {
    searchBarProps: StatefulSearchBarProps<Query>;
    effectiveTimeRange: TimeRange;
    onBrushEnd: NonNullable<TypedLensByValueInput['onBrushEnd']>;
}
/**
 * Local time-range state for inline Lens + unified SearchBar preview, driven by
 * `lensInput.timeRange` and `StatefulSearchBarProps` `dateRangeFrom` / `dateRangeTo`.
 */
export declare const useVisPreviewUnifiedSearch: ({ lensTimeRange, }: {
    lensTimeRange: TimeRange | undefined;
}) => UseVisPreviewUnifiedSearchResult;
export {};
