import React from 'react';
import type { FormBasedLayer } from '@kbn/lens-common';
import { operationDefinitionMap } from '../operations';
export declare const formulaOperationName = "formula";
export declare const staticValueOperationName = "static_value";
export declare const quickFunctionsName = "quickFunctions";
export declare const termsOperationName = "terms";
export declare const optionallySortableOperationNames: string[];
export declare const nonQuickFunctions: Set<string>;
export type TemporaryState = typeof quickFunctionsName | typeof staticValueOperationName | 'none';
export declare function isLayerChangingDueToOtherBucketChange(prevLayer: FormBasedLayer, newLayer: FormBasedLayer): boolean;
export declare function isLayerChangingDueToDecimalsPercentile(prevLayer: FormBasedLayer, newLayer: FormBasedLayer): boolean;
export declare function isQuickFunction(operationType: string): boolean;
export declare function getParamEditor(temporaryStaticValue: boolean, selectedOperationDefinition: (typeof operationDefinitionMap)[string] | undefined, showDefaultStaticValue: boolean): React.ComponentType<import("../operations/definitions").ParamEditorProps<import("@kbn/lens-common").BaseIndexPatternColumn, FormBasedLayer | ((prevLayer: FormBasedLayer) => FormBasedLayer)>> | null | undefined;
export declare const CalloutWarning: ({ currentOperationType, temporaryStateType, }: {
    currentOperationType: keyof typeof operationDefinitionMap | undefined;
    temporaryStateType: TemporaryState;
}) => React.JSX.Element | null;
export interface DimensionEditorGroupsOptions {
    enabled: boolean;
    state: boolean;
    onClick: () => void;
    id: typeof quickFunctionsName | typeof staticValueOperationName | typeof formulaOperationName;
    label: string;
}
export declare const DimensionEditorButtonGroups: ({ options, onMethodChange, selectedMethod, }: {
    options: DimensionEditorGroupsOptions[];
    onMethodChange: (id: string) => void;
    selectedMethod: string;
}) => React.JSX.Element;
