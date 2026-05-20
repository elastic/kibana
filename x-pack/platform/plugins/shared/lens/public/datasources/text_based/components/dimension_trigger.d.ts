import React from 'react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { DatasourceDimensionTriggerProps, TextBasedPrivateState } from '@kbn/lens-common';
export type TextBasedDimensionTrigger = DatasourceDimensionTriggerProps<TextBasedPrivateState> & {
    columnLabelMap: Record<string, string>;
    expressions: ExpressionsStart;
};
export declare function TextBasedDimensionTrigger(props: TextBasedDimensionTrigger): React.JSX.Element;
