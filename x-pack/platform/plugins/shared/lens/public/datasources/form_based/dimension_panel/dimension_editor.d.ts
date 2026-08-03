import React from 'react';
import type { GenericIndexPatternColumn, LensLayerType as LayerType, IndexPattern } from '@kbn/lens-common';
import type { FormBasedDimensionEditorProps } from './dimension_panel';
import type { OperationSupportMatrix } from './operation_support';
export interface DimensionEditorProps extends FormBasedDimensionEditorProps {
    selectedColumn?: GenericIndexPatternColumn;
    layerType: LayerType;
    operationSupportMatrix: OperationSupportMatrix;
    currentIndexPattern: IndexPattern;
}
export declare function DimensionEditor(props: DimensionEditorProps): React.JSX.Element;
