import type { FunctionComponent } from 'react';
import type { FieldHook } from '../../../../../../shared_imports';
type FieldType = 'text' | 'combox';
interface Props {
    field: FieldHook;
    disabled?: boolean;
    handleIsJson: Function;
    fieldType: FieldType;
}
export declare const XJsonToggle: FunctionComponent<Props>;
export {};
