import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
export declare function formatRawDocument({ hit, maxArrayItems, shouldNotTruncate, }: {
    hit: SearchHit<Record<string, unknown>>;
    maxArrayItems?: number;
    shouldNotTruncate?: (key: string) => boolean;
}): {
    _id?: string;
    fields: Record<string, unknown>;
} | undefined;
