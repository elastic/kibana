import type { ConvertUiamAPIKeysResponse } from '@kbn/core-security-server';
import type { ApiKeyToConvert, ConvertApiKeysResult } from '../types';
/**
 * Maps the UIAM convert API response and input tasks into result rows and failed-conversion status docs.
 * Caller must ensure `convertResponse.results.length === apiKeysToConvert.length`.
 */
export declare const mapUiamConvertResponseToKeyResults: (apiKeysToConvert: ApiKeyToConvert[], convertResponse: ConvertUiamAPIKeysResponse) => ConvertApiKeysResult;
