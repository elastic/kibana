import type { FIELD_ORIGIN } from '../../../common/constants';
import type { IField } from './field';
import { AbstractField } from './field';
import type { IVectorSource } from '../sources/vector_source';
export declare class InlineField<T extends IVectorSource> extends AbstractField implements IField {
    private readonly _label?;
    private readonly _source;
    private readonly _dataType;
    constructor({ fieldName, label, source, origin, dataType, }: {
        fieldName: string;
        label?: string;
        source: T;
        origin: FIELD_ORIGIN;
        dataType: string;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getSource(): IVectorSource;
    getLabel(): Promise<string>;
    getDataType(): Promise<string>;
}
