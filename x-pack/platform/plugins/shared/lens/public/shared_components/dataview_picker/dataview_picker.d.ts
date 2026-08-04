import React from 'react';
import type { EuiSelectableProps } from '@elastic/eui';
import { type IndexPatternRef } from '@kbn/lens-common';
import { type ChangeIndexPatternTriggerProps } from './trigger';
export declare function ChangeIndexPattern({ indexPatternRefs, isMissingCurrent, indexPatternId, onChangeIndexPattern, trigger, selectableProps, }: {
    trigger: ChangeIndexPatternTriggerProps;
    indexPatternRefs: IndexPatternRef[];
    isMissingCurrent?: boolean;
    onChangeIndexPattern: (newId: string) => void;
    indexPatternId?: string;
    selectableProps?: EuiSelectableProps;
}): React.JSX.Element;
