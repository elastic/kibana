import React from 'react';
import type { DocLinksStart } from '@kbn/core/public';
import type { ValueFormatConfig, TextBasedLayerColumn, GenericIndexPatternColumn } from '@kbn/lens-common';
type FormatParams = NonNullable<ValueFormatConfig['params']>;
export interface FormatSelectorProps {
    selectedColumn: GenericIndexPatternColumn | TextBasedLayerColumn;
    onChange: (newFormat?: {
        id: string;
        params?: FormatParams;
    }) => void;
    docLinks: DocLinksStart;
}
export declare function FormatSelector(props: FormatSelectorProps): React.JSX.Element;
export {};
