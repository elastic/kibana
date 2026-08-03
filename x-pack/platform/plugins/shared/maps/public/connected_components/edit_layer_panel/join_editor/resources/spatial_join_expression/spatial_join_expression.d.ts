import React from 'react';
import type { ESDistanceSourceDescriptor } from '../../../../../../common/descriptor_types';
interface Props {
    sourceDescriptor: Partial<ESDistanceSourceDescriptor>;
    onSourceDescriptorChange: (sourceDescriptor: Partial<ESDistanceSourceDescriptor>) => void;
}
export declare function SpatialJoinExpression(props: Props): React.JSX.Element;
export {};
