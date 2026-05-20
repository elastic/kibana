import React from 'react';
import type { FormBasedLayer, IndexPatternField } from '@kbn/lens-common';
export declare function BucketNestingEditor({ columnId, layer, setColumns, getFieldByName, }: {
    columnId: string;
    layer: FormBasedLayer;
    setColumns: (columns: string[]) => void;
    getFieldByName: (name: string) => IndexPatternField | undefined;
}): React.JSX.Element | null;
