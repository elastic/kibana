import type { ReactElement } from 'react';
import type { CustomIcon, StyleDescriptor } from '../../../common/descriptor_types';
export interface IStyle {
    getType(): string;
    renderEditor(onStyleDescriptorChange: (styleDescriptor: StyleDescriptor) => void, onCustomIconsChange: (customIcons: CustomIcon[]) => void): ReactElement<any> | null;
}
