import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
export interface AlertingEpisodeGroupingTagsProps {
    fields: readonly string[];
    data: Record<string, unknown>;
    /**
     * Source data view of the rule that produced the episode. When provided, grouping values are formatted
     * with each field's `fieldFormats` formatter (so typed fields like IP/date/number render correctly).
     * Without it, values fall back to an untyped best-effort format.
     */
    dataView?: DataView;
    'data-test-subj'?: string;
}
/**
 * Hollow badges for rule grouping field **values** (from parsed episode `data`).
 * Each badge shows the value only (CSS ellipsis); popover shows **field**: value.
 */
export declare function AlertingEpisodeGroupingTags({ fields, data, dataView, 'data-test-subj': dataTestSubj, }: AlertingEpisodeGroupingTagsProps): React.JSX.Element | null;
