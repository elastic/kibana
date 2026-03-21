import type { EsResourceType } from '@kbn/agent-builder-common';
export interface SearchTarget {
    type: EsResourceType;
    name: string;
}
