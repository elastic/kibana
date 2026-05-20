import type { EuiMarkdownAstNodePosition } from '@elastic/eui';
import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
export declare const LensEditor: React.NamedExoticComponent<import("@elastic/eui/src/components/markdown_editor/markdown_types").EuiMarkdownEditorUiPluginEditorProps<{
    timeRange: TypedLensByValueInput["timeRange"];
    position: EuiMarkdownAstNodePosition;
    attributes: TypedLensByValueInput["attributes"];
}>>;
export declare const plugin: {
    name: string;
    button: {
        label: string;
        iconType: string;
    };
    helpText: React.JSX.Element;
    editor: React.NamedExoticComponent<import("@elastic/eui/src/components/markdown_editor/markdown_types").EuiMarkdownEditorUiPluginEditorProps<{
        timeRange: TypedLensByValueInput["timeRange"];
        position: EuiMarkdownAstNodePosition;
        attributes: TypedLensByValueInput["attributes"];
    }>>;
};
