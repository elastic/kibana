import { AxiosResponse } from 'axios';

export const PLUGIN_ID = 'cck';
export const PLUGIN_NAME = 'cck';

export function mapSettledResponses<T, R>(
  responses: Array<PromiseSettledResult<AxiosResponse<T>> & { server: string }>,
  successCallback: (data: T, server: string, index: number) => R,
  errorCallback: (error: any, server: string, index: number) => R
): R[] {
  return responses.map((response, index) => {
    if (response.status === 'fulfilled') {
      // Call the success callback with the response data
      return successCallback(response.value.data, response.server, index);
    } else {
      return errorCallback(response.reason, response.server, index);
    }
  });
}
