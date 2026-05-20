import type { SampleDocument } from '../shared/record_types';
/**
 * When METADATA _source is included in an ES|QL query, each result row
 * contains a `_source` object alongside the typed column values. This
 * function supplements the ES|QL columns with unmapped fields from
 * `_source` so draft stream samples show the full document — matching
 * the behavior of the Search API used for materialized streams.
 *
 * ES|QL column values are authoritative (they may have been cast or
 * transformed by the view). `_source` only contributes fields that
 * don't exist as ES|QL columns.
 */
export declare function mergeSourceIntoDocuments(docs: SampleDocument[]): SampleDocument[];
