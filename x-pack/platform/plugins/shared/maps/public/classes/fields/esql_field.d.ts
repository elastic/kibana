import type { FIELD_ORIGIN } from '../../../common/constants';
import type { IField } from './field';
import { AbstractField } from './field';
import type { IVectorSource } from '../sources/vector_source';
import type { ESQLSource } from '../sources/esql_source';
import type { ITooltipProperty } from '../tooltips/tooltip_property';
export declare class ESQLField extends AbstractField implements IField {
    private readonly _source;
    constructor({ fieldName, source, origin, }: {
        fieldName: string;
        source: IVectorSource & Pick<ESQLSource, 'getESQL' | 'getIndexPattern'>;
        origin: FIELD_ORIGIN;
    });
    supportsFieldMetaFromEs(): boolean;
    supportsFieldMetaFromLocalData(): boolean;
    getSource(): IVectorSource;
    getDataType(): Promise<string>;
    createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty>;
}
