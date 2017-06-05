const SYSTEM_API_HEADER_NAME = 'kbn-system-api';

/**
 * Adds a custom header designating request as system API
 * @param originalHeaders Object representing set of headers
 * @return Object representing set of headers, with system API header added in
 */
export function addSystemApiHeader(originalHeaders) {
  const systemApiHeaders = {
    [SYSTEM_API_HEADER_NAME]: true
  };
  return {
    ...originalHeaders,
    ...systemApiHeaders
  };
}

/**
 * Returns true if request is a system API request; false otherwise
 *
 * @param request Object Request object created by $http service
 * @return true if request is a system API request; false otherwise
 */
export function isSystemApiRequest(request) {
  return !!request.headers[SYSTEM_API_HEADER_NAME];
}
