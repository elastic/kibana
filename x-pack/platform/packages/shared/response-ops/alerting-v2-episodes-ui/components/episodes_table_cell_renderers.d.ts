import React from 'react';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
type Rule = FindRulesResponse['items'][number];
type CellRendererProps = Parameters<CustomCellRenderer[string]>[0];
export declare const EpisodeStatusCell: ({ row, columnId }: CellRendererProps) => React.JSX.Element;
export declare const EpisodeTagsCell: ({ row }: CellRendererProps) => React.JSX.Element;
export declare const EpisodeSeverityCell: ({ row }: CellRendererProps) => React.JSX.Element;
export interface EpisodeRuleCellProps extends CellRendererProps {
    rulesCache: Record<string, Rule>;
    isLoadingRules: boolean;
    rowHeight: number;
    /** Source data views keyed by rule id, used to format grouping values via `fieldFormats`. */
    sourceDataViewsByRule?: Map<string, DataView>;
}
export declare const EpisodeRuleCell: ({ row, columnId, rulesCache, isLoadingRules, rowHeight, sourceDataViewsByRule, }: EpisodeRuleCellProps) => React.JSX.Element;
export {};
