import type { FIELD_ORIGIN } from '../../../common/constants';
import type { IField } from './field';
import { AbstractField } from './field';
import type { IVectorSource } from '../sources/vector_source';
import type { IEmsFileSource } from '../sources/ems_file_source';
export declare class EMSFileField extends AbstractField implements IField {
    private readonly _source;
    constructor({ fieldName, source, origin, }: {
        fieldName: string;
        source: IEmsFileSource;
        origin: FIELD_ORIGIN;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getSource(): IVectorSource;
    getLabel(): Promise<string>;
}
