import React from 'react';
import type { CustomCellRenderer } from '@kbn/unified-data-table';
import type { FindRulesResponse } from '@kbn/alerting-v2-schemas';
type Rule = FindRulesResponse['items'][number];
type CellRendererProps = Parameters<CustomCellRenderer[string]>[0];
export declare const EpisodeStatusCell: ({ row, columnId }: CellRendererProps) => React.JSX.Element;
export declare const EpisodeTagsCell: ({ row }: CellRendererProps) => React.JSX.Element;
export interface EpisodeRuleCellProps extends CellRendererProps {
    rulesCache: Record<string, Rule>;
    isLoadingRules: boolean;
    rowHeight: number;
}
export declare const EpisodeRuleCell: ({ row, columnId, rulesCache, isLoadingRules, rowHeight, }: EpisodeRuleCellProps) => React.JSX.Element;
export {};
