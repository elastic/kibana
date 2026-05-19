import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { CreateDocSourceResp } from '../../../../../common/types';
export declare const createNewIndexAndPattern: ({ indexName, defaultMappings, }: {
    indexName: string;
    defaultMappings: MappingTypeMapping | {};
}) => Promise<CreateDocSourceResp>;
