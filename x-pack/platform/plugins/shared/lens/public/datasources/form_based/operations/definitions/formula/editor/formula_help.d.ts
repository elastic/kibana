import React from 'react';
import type { FormulaIndexPatternColumn, IndexPattern } from '@kbn/lens-common';
import type { GenericOperationDefinition, ParamEditorProps } from '../..';
export declare function getDocumentationSections({ indexPattern, operationDefinitionMap, }: {
    indexPattern: IndexPattern;
    operationDefinitionMap: Record<string, GenericOperationDefinition>;
}): {
    groups: {
        label: string;
        description?: string;
        items: Array<{
            label: string;
            description: {
                markdownContent: string;
            };
        }>;
    }[];
    initialSection: React.JSX.Element;
};
export declare function getFunctionSignatureLabel(name: string, operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap'], getFullSignature?: boolean): string;
/**
 * Get an array of strings containing all possible information about a specific
 * operation type: examples and infos.
 */
export declare function getHelpTextContent(type: string, operationDefinitionMap: ParamEditorProps<FormulaIndexPatternColumn>['operationDefinitionMap']): {
    description: string;
    examples: string[];
};
