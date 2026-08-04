import React from 'react';
import type { Props } from '../style_prop_editor';
import type { LabelDynamicOptions, LabelStaticOptions } from '../../../../../../common/descriptor_types';
type LabelEditorProps = Omit<Props<LabelStaticOptions, LabelDynamicOptions>, 'children'>;
export declare function VectorStyleLabelEditor(props: LabelEditorProps): React.JSX.Element;
export {};
