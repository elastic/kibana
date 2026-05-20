import type { Streams } from '../models/streams';
/**
 * Parses a stream upsert request and converts it into the corresponding stream definition.
 * Given that upsert requests don't include name field, the stream name is provided separately.
 * For updated_at fields, given that an upsert request implies an update operation, the current timestamp is used.
 * @param name Stream name
 * @param request Stream upsert request
 * @throws Error if the upsert request doesn't match any known stream upsert request schema
 * @returns The corresponding stream definition for the provided upsert request
 */
export declare const convertUpsertRequestIntoDefinition: (name: string, request: Streams.all.UpsertRequest) => Streams.all.Definition;
/**
 * Parses a stream get response and converts it into the corresponding stream upsert request.
 * It will omit fields that are not part of the upsert request, such as name and updated_at timestamps.
 * @param getResponse The stream get response to be converted
 * @throws Error if the get response doesn't match any known stream get response schema
 * @returns The corresponding stream upsert request for the provided get response
 */
export declare const convertGetResponseIntoUpsertRequest: (getResponse: Streams.all.GetResponse) => Streams.all.UpsertRequest;
