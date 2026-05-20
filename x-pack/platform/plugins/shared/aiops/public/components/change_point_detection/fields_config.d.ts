import { type FC, type PropsWithChildren } from 'react';
import type { SelectedChangePoint } from './change_point_detection_context';
import { type ChangePointAnnotation, type FieldConfig } from './change_point_detection_context';
/**
 * Contains panels with controls and change point results.
 */
export declare const FieldsConfig: FC;
export interface FieldPanelProps {
    panelIndex: number;
    fieldConfig: FieldConfig;
    removeDisabled: boolean;
    onChange: (update: FieldConfig) => void;
    onRemove: () => void;
    onSelectionChange: (update: SelectedChangePoint[]) => void;
    'data-test-subj': string;
}
interface FieldsControlsProps {
    fieldConfig: FieldConfig;
    onChange: (update: FieldConfig) => void;
}
/**
 * Renders controls for fields selection and emits updates on change.
 */
export declare const FieldsControls: FC<PropsWithChildren<FieldsControlsProps>>;
interface ChangePointResultsProps {
    fieldConfig: FieldConfig;
    splitFieldCardinality: number | null;
    isLoading: boolean;
    results: ChangePointAnnotation[];
    isUsingSampleData: boolean;
    onSelectionChange: (update: SelectedChangePoint[]) => void;
}
/**
 * Handles request and rendering results of the change point  with provided config.
 */
export declare const ChangePointResults: FC<ChangePointResultsProps>;
export {};
