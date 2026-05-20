import type { SampleDocument } from '../shared/record_types';
/**
 * OTel passthrough objects and explicit aliases produce duplicate columns
 * in ES|QL results. Strip them so draft samples match what the Search API
 * returns for non-draft streams.
 *
 * Two categories are removed:
 * 1. Passthrough aliases — e.g. `host.name` when `attributes.host.name` exists
 * 2. Explicit OTel aliases — e.g. `message` only when `body.text` also exists
 *
 * Both checks are conditional: the alias is only stripped when the
 * corresponding source field is present in the document. This avoids
 * incorrectly removing real fields from non-OTel streams (e.g. `message`
 * in ECS data where `body.text` doesn't exist).
 */
export declare function stripOtelAliases(docs: SampleDocument[]): SampleDocument[];
