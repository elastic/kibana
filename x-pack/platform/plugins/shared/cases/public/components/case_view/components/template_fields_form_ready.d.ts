import type { FC, MutableRefObject } from 'react';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import type { OnUpdateFields } from '../types';
export declare const EMPTY_EXTENDED_FIELDS: Record<string, unknown>;
/**
 * API exposed to a parent component when the form is used in batch mode
 * (i.e. `formApiRef` is provided). The parent calls `trigger()` to validate
 * all visible fields and, if valid, reads `getValues()` to collect the current
 * snake-keyed field values.
 */
export interface TemplateFieldsFormApi {
    trigger: () => Promise<boolean>;
    getValues: () => Record<string, unknown>;
}
interface TemplateFieldsFormReadyBaseProps {
    resolvedFields: InlineField[];
    extendedFields: Record<string, unknown>;
}
interface AutosaveProps extends TemplateFieldsFormReadyBaseProps {
    /** Per-field autosave mode (default). Required when `formApiRef` is not provided. */
    onUpdateField: (args: OnUpdateFields) => void;
    formApiRef?: never;
    applyDefaults?: never;
}
interface BatchProps extends TemplateFieldsFormReadyBaseProps {
    /**
     * Batch / validate-all mode. When provided, per-field autosave is disabled and the
     * parent drives validation and value collection through this ref.
     */
    formApiRef: MutableRefObject<TemplateFieldsFormApi | null>;
    /**
     * When `true`, seed each field's initial value with the template YAML default when
     * the case has no existing value for that field (i.e. carry-over logic). Only
     * meaningful in batch mode; ignored in autosave mode.
     */
    applyDefaults?: boolean;
    onUpdateField?: never;
}
export type TemplateFieldsFormReadyProps = AutosaveProps | BatchProps;
export declare const TemplateFieldsFormReady: FC<TemplateFieldsFormReadyProps>;
export {};
