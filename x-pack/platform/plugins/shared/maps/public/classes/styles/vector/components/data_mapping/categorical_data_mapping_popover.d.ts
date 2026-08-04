import React from 'react';
import type { FieldMetaOptions } from '../../../../../../common/descriptor_types';
interface Props<DynamicOptions> {
    fieldMetaOptions: FieldMetaOptions;
    onChange: (updatedOptions: DynamicOptions) => void;
    supportsFieldMetaFromLocalData: boolean;
}
export declare function CategoricalDataMappingPopover<DynamicOptions>(props: Props<DynamicOptions>): React.JSX.Element;
export {};
