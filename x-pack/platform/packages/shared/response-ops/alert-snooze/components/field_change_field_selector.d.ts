import React from 'react';
import { type EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataConditionEntry } from './types';
export interface FieldChangeFieldSelectorProps {
    entry: DataConditionEntry;
    onChange: (next: DataConditionEntry) => void;
    /** Leaf-level scalar alert fields offered as options. */
    options: Array<EuiComboBoxOptionOption<string>>;
    isLoading?: boolean;
}
/**
 * Searchable dropdown used by the `field_change` snooze condition. Options are
 * scoped to the alert document's leaf-level scalar fields (supplied by the
 * caller via the snooze component's `fieldOptions` prop), preventing users from
 * entering unsupported nested/array paths (see issue #275054). This component is
 * purely presentational — the package never fetches; consumers do.
 */
export declare const FieldChangeFieldSelector: ({ entry, onChange, options, isLoading, }: FieldChangeFieldSelectorProps) => React.JSX.Element;
