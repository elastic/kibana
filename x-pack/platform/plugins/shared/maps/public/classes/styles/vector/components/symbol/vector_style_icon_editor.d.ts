import React from 'react';
import type { Props } from '../style_prop_editor';
import type { CustomIcon, IconDynamicOptions, IconStaticOptions } from '../../../../../../common/descriptor_types';
type IconEditorProps = Omit<Props<IconStaticOptions, IconDynamicOptions>, 'children'>;
export declare function VectorStyleIconEditor(props: IconEditorProps & {
    customIcons: CustomIcon[];
    onCustomIconsChange: (customIcons: CustomIcon[]) => void;
}): React.JSX.Element;
export {};
