import type { Query } from '@kbn/data-plugin/common';
import type { DataFilters, VectorSourceRequestMeta } from '../../../common/descriptor_types';
import type { IVectorSource } from '../sources/vector_source';
import type { IJoinSource } from '../sources/join_sources';
export declare function buildVectorRequestMeta(source: IVectorSource | IJoinSource, fieldNames: string[], dataFilters: DataFilters, sourceQuery: Query | null | undefined, isForceRefresh: boolean, isFeatureEditorOpenForLayer: boolean): VectorSourceRequestMeta;
