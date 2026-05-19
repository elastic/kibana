import React from 'react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TextBasedPrivateState, DatasourceDimensionEditorProps } from '@kbn/lens-common';
export type TextBasedDimensionEditorProps = DatasourceDimensionEditorProps<TextBasedPrivateState> & {
    expressions: ExpressionsStart;
};
export declare function TextBasedDimensionEditor(props: TextBasedDimensionEditorProps): React.JSX.Element;
