import type { SourceRequestMeta } from '../../../../common/descriptor_types';
import type { ISource } from '../source';
export interface ITMSSource extends ISource {
    getUrlTemplate(requestMeta: SourceRequestMeta): Promise<string>;
}
