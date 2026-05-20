import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
/**
 * Reads the `inference_id` currently configured on a `semantic_text` field
 * in an existing index.
 *
 * Returns `undefined` when:
 *  - the index does not exist yet (first boot)
 *  - the field is not mapped as `semantic_text`
 *  - the mapping has no explicit `inference_id` (uses cluster default)
 *
 * This is used to construct storage settings that are compatible with the
 * existing mapping so that `putMapping` does not attempt an incompatible
 * inference endpoint change (e.g. ELSER sparse -> Jina dense).
 */
export declare function getInferenceIdFromIndex(esClient: ElasticsearchClient, indexAlias: string, dottedFieldPath: string, logger: Logger): Promise<string | undefined>;
