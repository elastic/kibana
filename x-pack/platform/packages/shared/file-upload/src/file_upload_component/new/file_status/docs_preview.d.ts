import type { FC } from 'react';
import { type DataTableRecord } from '@kbn/discover-utils';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
interface ResultsPreviewProps {
    sampleDocs: DataTableRecord[];
    mappings: MappingTypeMapping;
    index: number;
}
export declare const ResultsPreview: FC<ResultsPreviewProps>;
export {};
