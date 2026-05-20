import type { ISource } from '../sources/source';
import type { DataRequestMeta, Timeslice } from '../../../common/descriptor_types';
import type { DataRequest } from './data_request';
export declare function updateDueToExtent(prevMeta?: DataRequestMeta, nextMeta?: DataRequestMeta): boolean;
export declare function canSkipSourceUpdate({ source, prevDataRequest, nextRequestMeta, extentAware, getUpdateDueToTimeslice, }: {
    source: ISource;
    prevDataRequest: DataRequest | undefined;
    nextRequestMeta: DataRequestMeta;
    extentAware: boolean;
    getUpdateDueToTimeslice: (timeslice?: Timeslice) => boolean;
}): Promise<boolean>;
export declare function canSkipStyleMetaUpdate({ prevDataRequest, nextMeta, }: {
    prevDataRequest: DataRequest | undefined;
    nextMeta: DataRequestMeta;
}): boolean;
export declare function canSkipFormattersUpdate({ prevDataRequest, nextMeta, }: {
    prevDataRequest: DataRequest | undefined;
    nextMeta: DataRequestMeta;
}): boolean;
