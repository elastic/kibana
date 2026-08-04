import React from 'react';
import type { Props } from '../style_prop_editor';
import type { ColorDynamicOptions, ColorStaticOptions } from '../../../../../../common/descriptor_types';
type ColorEditorProps = Omit<Props<ColorStaticOptions, ColorDynamicOptions>, 'children'> & {
    swatches: string[];
};
export declare function VectorStyleColorEditor(props: ColorEditorProps): React.JSX.Element;
export {};
