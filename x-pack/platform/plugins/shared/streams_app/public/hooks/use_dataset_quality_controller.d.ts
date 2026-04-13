import { Streams } from '@kbn/streams-schema';
import type { DatasetQualityDetailsController } from '@kbn/dataset-quality-plugin/public/controller/dataset_quality_details';
export declare const useDatasetQualityController: (definition: Streams.ingest.all.GetResponse, saveStateInUrl?: boolean, refreshDefinition?: () => void) => DatasetQualityDetailsController | undefined;
