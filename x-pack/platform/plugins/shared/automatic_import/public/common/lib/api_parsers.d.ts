import type { EpmPackageResponse } from './api';
/**
 * Gets the integration name from the response.
 * First tries to get it from the _meta.name field, then falls back to parsing it from ingest pipeline names.
 * Since the integration name is not always returned in the response we have to parse it from the ingest pipeline name.
 * TODO: Return the package name from the fleet API: https://github.com/elastic/kibana/issues/185932
 */
export declare const getIntegrationNameFromResponse: (response: EpmPackageResponse) => string;
