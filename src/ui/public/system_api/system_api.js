const SYSTEM_API_HEADER_NAME = 'kbn-system-api';

export default function SystemApisProvider() {

  /**
   * Adds a custom header designating request as system API
   * @param headers Object representing set of headers
   * @return Object representing set of headers, with system API header added in
   */
  function addSystemApiHeader(headers) {
    headers[SYSTEM_API_HEADER_NAME] = true;
    return headers;
  }

  /**
   * Returns true if request is a system API request; false otherwise
   *
   * @param request Object Request object created by $http service
   * @return true if request is a system API request; false otherwise
   */
  function isSystemApiRequest(request) {
    return !!request.headers[SYSTEM_API_HEADER_NAME];
  }

  // Public interface
  return {
    addSystemApiHeader,
    isSystemApiRequest
  };
}
