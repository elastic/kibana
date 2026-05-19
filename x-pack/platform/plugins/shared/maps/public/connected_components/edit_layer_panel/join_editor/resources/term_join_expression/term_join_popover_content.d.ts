import React from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { ESTermSourceDescriptor } from '../../../../../../common/descriptor_types';
import type { JoinField } from '../../join_editor';
interface Props {
    leftSourceName?: string;
    leftValue?: string;
    leftFields: JoinField[];
    onLeftFieldChange: (leftField: string) => void;
    sourceDescriptor: Partial<ESTermSourceDescriptor>;
    onSourceDescriptorChange: (sourceDescriptor: Partial<ESTermSourceDescriptor>) => void;
    rightFields: DataViewField[];
}
export declare function TermJoinPopoverContent(props: Props): React.JSX.Element;
export {};
