import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { CustomPackageDatasetConfiguration } from '../../../install';
export declare const generateDatastreamEntries: (datasets: CustomPackageDatasetConfiguration[], packageName: string) => {
    type: import("../../../../../../../common/types").PackageDataStreamTypes;
    dataset: string;
    title: string;
    package: string;
    path: string;
    release: "ga";
    ingest_pipeline: string;
    elasticsearch: {
        'index_template.mappings': MappingTypeMapping;
    };
}[];
