import React from 'react';
import type { Props } from '../style_prop_editor';
import type { SizeDynamicOptions, SizeStaticOptions } from '../../../../../../common/descriptor_types';
type SizeEditorProps = Omit<Props<SizeStaticOptions, SizeDynamicOptions>, 'children'>;
export declare function VectorStyleSizeEditor(props: SizeEditorProps): React.JSX.Element;
export {};
