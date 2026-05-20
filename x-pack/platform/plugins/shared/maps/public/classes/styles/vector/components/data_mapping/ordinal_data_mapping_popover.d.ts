import React from 'react';
import type { FieldMetaOptions } from '../../../../../../common/descriptor_types';
import type { VECTOR_STYLES } from '../../../../../../common/constants';
import { DATA_MAPPING_FUNCTION } from '../../../../../../common/constants';
interface Props<DynamicOptions> {
    fieldMetaOptions: FieldMetaOptions;
    styleName: VECTOR_STYLES;
    onChange: (updatedOptions: DynamicOptions) => void;
    dataMappingFunction: DATA_MAPPING_FUNCTION;
    supportedDataMappingFunctions: DATA_MAPPING_FUNCTION[];
    supportsFieldMetaFromLocalData: boolean;
}
export declare function OrdinalDataMappingPopover<DynamicOptions>(props: Props<DynamicOptions>): React.JSX.Element;
export {};
