import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { DataViewsCommonService } from '@kbn/data-plugin/server';
import type { CreateDocSourceResp } from '../../common/types';
export declare function createDocSource(index: string, mappings: MappingTypeMapping, { asCurrentUser }: IScopedClusterClient, indexPatternsService: DataViewsCommonService): Promise<CreateDocSourceResp>;
