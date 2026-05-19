import React from 'react';
import type { CollapseFunction } from '../../common/expressions';
export declare function CollapseSetting({ value, onChange, display, }: {
    value: string;
    onChange: (value: CollapseFunction) => void;
    display?: 'rowCompressed' | 'columnCompressed';
}): React.JSX.Element;
