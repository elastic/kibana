import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CckServerDefinition } from '../common/config';

export function getCCKClient(server: CckServerDefinition): AxiosInstance {
  // Create a new axios instance with preconfigured settings
  const client = axios.create({
    baseURL: server.endpoint,
    headers: {
      Authorization: `ApiKey ${server.apiKey}`,
      'Content-Type': 'application/json',
      'x-elastic-internal-origin': 'Kibana',
      'kbn-xsrf': 'foo',
    },
  });

  return client;
}

export function getMultiCCKClient(servers: CckServerDefinition[]): {
  request: <T = any>(
    method: string,
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ) => Promise<Array<PromiseSettledResult<AxiosResponse<T>> & { server: string }>>;
} {
  const clients = servers.map((server) => getCCKClient(server));

  return {
    request: async <T = any>(
      method: string,
      url: string,
      data?: any,
      config?: AxiosRequestConfig
    ): Promise<Array<PromiseSettledResult<AxiosResponse<T>> & { server: string }>> => {
      const requests = clients.map((client) => {
        // Use the appropriate axios method based on the provided method string
        switch (method.toUpperCase()) {
          case 'GET':
            return client.get<T>(url, config);
          case 'POST':
            return client.post<T>(url, data, config);
          case 'PUT':
            return client.put<T>(url, data, config);
          case 'DELETE':
            return client.delete<T>(url, config);
          case 'PATCH':
            return client.patch<T>(url, data, config);
          default:
            return client.request<T>({
              method,
              url,
              data,
              ...config,
            });
        }
      });

      return (await Promise.allSettled(requests)).map((response, index) => ({
        ...response,
        server: servers[index].name,
      }));
    },
  };
}
