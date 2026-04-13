import React from 'react';
import type { TControls } from './hooks/use_controls';
import type { SchemaEditorProps } from './types';
interface ControlsProps {
    controls: TControls;
    onChange: (nextControls: Partial<TControls>) => void;
    onAddField: SchemaEditorProps['onAddField'];
    onRefreshData: SchemaEditorProps['onRefreshData'];
}
export declare function Controls({ controls, onAddField, onChange, onRefreshData }: ControlsProps): React.JSX.Element;
export {};
