import React from 'react';
import type { FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { ParamEditorProps } from '../..';
import { getDateHistogramInterval } from '../../../../time_shift_utils';
export declare const WrappedFormulaEditor: ({ activeData, ...rest }: ParamEditorProps<FormulaIndexPatternColumn>) => React.JSX.Element;
export declare function FormulaEditor({ layer, paramEditorUpdater, currentColumn, columnId, indexPattern, operationDefinitionMap, kql, dataViews, toggleFullscreen, isFullscreen, dateHistogramInterval, hasData, dateRange, uiSettings, data, }: Omit<ParamEditorProps<FormulaIndexPatternColumn>, 'activeData'> & {
    dateHistogramInterval: ReturnType<typeof getDateHistogramInterval>;
    hasData: boolean;
}): React.JSX.Element;
