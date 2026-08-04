import type { IField } from './field';
import { AbstractField } from './field';
import type { FIELD_ORIGIN } from '../../../common/constants';
import { MVT_FIELD_TYPE } from '../../../common/constants';
import type { IVectorSource } from '../sources/vector_source';
import type { IMvtVectorSource } from '../sources/vector_source';
import type { MVTFieldDescriptor } from '../../../common/descriptor_types';
export declare class MVTField extends AbstractField implements IField {
    private readonly _source;
    private readonly _type;
    constructor({ fieldName, type, source, origin, }: {
        fieldName: string;
        source: IMvtVectorSource;
        origin: FIELD_ORIGIN;
        type: MVT_FIELD_TYPE;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getMVTFieldDescriptor(): MVTFieldDescriptor;
    getSource(): IVectorSource;
    getDataType(): Promise<string>;
    getLabel(): Promise<string>;
}
