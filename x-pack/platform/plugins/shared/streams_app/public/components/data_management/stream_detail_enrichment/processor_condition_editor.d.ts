import { default as React } from 'react';
import type { ConditionEditorProps } from '../shared/condition_editor';
export type ProcessorConditionEditorProps = Omit<ConditionEditorProps, 'status' | 'fieldSuggestions'>;
export declare function ProcessorConditionEditorWrapper(props: ProcessorConditionEditorProps): React.JSX.Element;
