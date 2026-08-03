import React from 'react';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
interface Props {
    mostCommonDataViewId?: string;
    onSourceConfigChange: (sourceConfig: Partial<ESQLSourceDescriptor> | null) => void;
}
export declare function CreateSourceEditor(props: Props): React.JSX.Element;
export {};
