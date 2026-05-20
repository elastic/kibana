import type { CaseConnector } from '../../../common/types/domain';
import type { IndexRefresh } from '../../services/types';
export interface MappingsArgs {
    connector: CaseConnector;
}
export interface CreateMappingsArgs extends MappingsArgs, IndexRefresh {
    owner: string;
}
export interface UpdateMappingsArgs extends MappingsArgs, IndexRefresh {
    mappingId: string;
}
