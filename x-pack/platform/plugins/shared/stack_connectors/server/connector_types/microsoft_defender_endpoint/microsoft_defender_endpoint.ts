/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceParams } from '@kbn/actions-plugin/server';
import { SubActionConnector } from '@kbn/actions-plugin/server';
import type { AxiosError, AxiosResponse } from 'axios';
import type { SubActionRequestParams } from '@kbn/actions-plugin/server/sub_action_framework/types';
import type { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { Stream } from 'stream';
import { OAuthTokenManager } from './o_auth_token_manager';
import { MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION } from '../../../common/microsoft_defender_endpoint/constants';
import {
  IsolateHostParamsSchema,
  ReleaseHostParamsSchema,
  TestConnectorParamsSchema,
  MicrosoftDefenderEndpointDoNotValidateResponseSchema,
  GetActionsParamsSchema,
  AgentDetailsParamsSchema,
  AgentListParamsSchema,
  RunScriptParamsSchema,
  MicrosoftDefenderEndpointEmptyParamsSchema,
  GetActionResultsParamsSchema,
  DownloadActionResultsResponseSchema,
} from '../../../common/microsoft_defender_endpoint/schema';
import type {
  MicrosoftDefenderEndpointAgentDetailsParams,
  MicrosoftDefenderEndpointIsolateHostParams,
  MicrosoftDefenderEndpointBaseApiResponse,
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets,
  MicrosoftDefenderEndpointReleaseHostParams,
  MicrosoftDefenderEndpointTestConnectorParams,
  MicrosoftDefenderEndpointMachine,
  MicrosoftDefenderEndpointMachineAction,
  MicrosoftDefenderEndpointTestConnector,
  MicrosoftDefenderEndpointGetActionsParams,
  MicrosoftDefenderEndpointGetActionsResponse,
  MicrosoftDefenderEndpointAgentListParams,
  MicrosoftDefenderEndpointAgentListResponse,
  MicrosoftDefenderGetLibraryFilesResponse,
  MicrosoftDefenderEndpointRunScriptParams,
  MicrosoftDefenderEndpointGetActionResultsResponse,
} from '../../../common/microsoft_defender_endpoint/types';

export class MicrosoftDefenderEndpointConnector extends SubActionConnector<
  MicrosoftDefenderEndpointConfig,
  MicrosoftDefenderEndpointSecrets
> {
  private readonly oAuthToken: OAuthTokenManager;

  private readonly urls: {
    machines: string;
    machineActions: string;
    libraryFiles: string;
  };

  constructor(
    params: ServiceParams<MicrosoftDefenderEndpointConfig, MicrosoftDefenderEndpointSecrets>
  ) {
    super(params);
    this.oAuthToken = new OAuthTokenManager({
      ...params,
      apiRequest: async (...args) => this.request(...args),
    });

    this.urls = {
      machines: `${this.config.apiUrl}/api/machines`,
      // API docs: https://learn.microsoft.com/en-us/defender-endpoint/api/get-machineactions-collection
      machineActions: `${this.config.apiUrl}/api/machineactions`,
      libraryFiles: `${this.config.apiUrl}/api/libraryfiles`,
    };

    this.registerSubActions();
  }

  private registerSubActions() {
    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_DETAILS,
      method: 'getAgentDetails',
      schema: AgentDetailsParamsSchema,
    });
    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_AGENT_LIST,
      method: 'getAgentList',
      schema: AgentListParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.ISOLATE_HOST,
      method: 'isolateHost',
      schema: IsolateHostParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RELEASE_HOST,
      method: 'releaseHost',
      schema: ReleaseHostParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.TEST_CONNECTOR,
      method: 'testConnector',
      schema: TestConnectorParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTIONS,
      method: 'getActions',
      schema: GetActionsParamsSchema,
    });
    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_LIBRARY_FILES,
      method: 'getLibraryFiles',
      schema: MicrosoftDefenderEndpointEmptyParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.RUN_SCRIPT,
      method: 'runScript',
      schema: RunScriptParamsSchema,
    });

    this.registerSubAction({
      name: MICROSOFT_DEFENDER_ENDPOINT_SUB_ACTION.GET_ACTION_RESULTS,
      method: 'getActionResults',
      schema: GetActionResultsParamsSchema,
    });
  }

  private async fetchFromMicrosoft<R extends MicrosoftDefenderEndpointBaseApiResponse>(
    req: Omit<SubActionRequestParams<R>, 'responseSchema'>,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<R> {
    this.logger.debug(() => `Request:\n${JSON.stringify(req, null, 2)}`);

    const requestOptions: SubActionRequestParams<R> = {
      ...req,
      // We don't validate responses from Microsoft API's because we do not want failures for cases
      // where the external system might add/remove/change values in the response that we have no
      // control over.
      responseSchema:
        MicrosoftDefenderEndpointDoNotValidateResponseSchema as unknown as SubActionRequestParams<R>['responseSchema'],
      headers: {
        Authorization: `Bearer ${await this.oAuthToken.get(connectorUsageCollector)}`,
      },
    };
    let response: AxiosResponse<R>;
    let was401RetryDone = false;

    try {
      response = await this.request<R>(requestOptions, connectorUsageCollector);
    } catch (err) {
      if (was401RetryDone) {
        throw err;
      }

      this.logger.debug("API call failed! Determining if it's one we can retry");

      // If error was a 401, then for some reason the token used was not valid (ex. perhaps the connector's credentials
      // were updated). IN this case, we will try again by ensuring a new token is re-generated
      if (err.message.includes('Status code: 401')) {
        this.logger.warn(
          `Received HTTP 401 (Unauthorized). Re-generating new access token and trying again`
        );
        was401RetryDone = true;
        await this.oAuthToken.generateNew(connectorUsageCollector);
        requestOptions.headers!.Authorization = `Bearer ${await this.oAuthToken.get(
          connectorUsageCollector
        )}`;
        response = await this.request<R>(requestOptions, connectorUsageCollector);
      } else {
        throw err;
      }
    }

    return response.data;
  }

  protected getResponseErrorMessage(error: AxiosError): string {
    const appendResponseBody = (message: string): string => {
      const responseBody = JSON.stringify(error.response?.data ?? {});

      if (responseBody) {
        return `${message}\nURL called:[${error.response?.config?.method}] ${error.response?.config?.url}\nResponse body: ${responseBody}`;
      }

      return message;
    };

    if (!error.response?.status) {
      return appendResponseBody(error.message ?? 'Unknown API Error');
    }

    if (error.response.status === 401) {
      return appendResponseBody('Unauthorized API Error (401)');
    }

    return appendResponseBody(`API Error: [${error.response?.statusText}] ${error.message}`);
  }

  private buildODataUrlParams({
    filter = {},
    page = 1,
    pageSize = 20,
    sortField = '',
    sortDirection = 'desc',
  }: {
    filter: Record<string, string | string[]>;
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortDirection?: string;
  }): Partial<BuildODataUrlParamsResponse> {
    const oDataQueryOptions: Partial<BuildODataUrlParamsResponse> = {
      $count: true,
    };

    if (pageSize) {
      oDataQueryOptions.$top = pageSize;
    }

    if (page > 1) {
      oDataQueryOptions.$skip = page * pageSize - pageSize;
    }

    if (sortField) {
      oDataQueryOptions.$orderby = `${sortField} ${sortDirection}`;
    }

    const filterEntries = Object.entries(filter);

    if (filterEntries.length > 0) {
      oDataQueryOptions.$filter = '';

      for (const [key, value] of filterEntries) {
        const isArrayValue = Array.isArray(value);

        if (oDataQueryOptions.$filter) {
          oDataQueryOptions.$filter += ' AND ';
        }

        oDataQueryOptions.$filter += `${key} ${isArrayValue ? 'in' : 'eq'} ${
          isArrayValue
            ? '(' + value.map((valueString) => `'${valueString}'`).join(',') + ')'
            : `'${value}'`
        }`;
      }
    }

    return oDataQueryOptions;
  }

  public async testConnector(
    _: MicrosoftDefenderEndpointTestConnectorParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointTestConnector> {
    const results: string[] = [];

    const catchErrorAndIgnoreExpectedErrors = (err: Error) => {
      if (err.message.includes('ResourceNotFound')) {
        return '';
      }
      throw err;
    };

    await this.getAgentDetails({ id: 'elastic-connector-test' }, connectorUsageCollector)
      .catch(catchErrorAndIgnoreExpectedErrors)
      .then(() => {
        results.push('API call to Machines API was successful');
      });

    await this.isolateHost(
      { id: 'elastic-connector-test', comment: 'connector test' },
      connectorUsageCollector
    )
      .catch(catchErrorAndIgnoreExpectedErrors)
      .then(() => {
        results.push('API call to Machine Isolate was successful');
      });

    await this.releaseHost(
      { id: 'elastic-connector-test', comment: 'connector test' },
      connectorUsageCollector
    )
      .catch(catchErrorAndIgnoreExpectedErrors)
      .then(() => {
        results.push('API call to Machine Release was successful');
      });

    await this.getActions({ pageSize: 1 }, connectorUsageCollector)
      .catch(catchErrorAndIgnoreExpectedErrors)
      .then(() => {
        results.push('API call to Machine Actions was successful');
      });

    await this.runScript(
      {
        id: 'elastic-connector-test',
        comment: 'connector test',
        parameters: { scriptName: 'test' },
      },
      connectorUsageCollector
    )
      .catch(catchErrorAndIgnoreExpectedErrors)
      .then(() => {
        results.push('API call to Machine RunScript was successful');
      });

    return { results };
  }

  public async getAgentDetails(
    { id }: MicrosoftDefenderEndpointAgentDetailsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointMachine> {
    // API Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/machine

    return this.fetchFromMicrosoft<MicrosoftDefenderEndpointMachine>(
      { url: `${this.urls.machines}/${id}` },
      connectorUsageCollector
    );
  }

  public async getAgentList(
    { page = 1, pageSize = 20, ...filter }: MicrosoftDefenderEndpointAgentListParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointAgentListResponse> {
    // API Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/get-machines
    // OData usage reference: https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-odata-samples

    const response = await this.fetchFromMicrosoft<MicrosoftDefenderEndpointAgentListResponse>(
      {
        url: `${this.urls.machines}`,
        method: 'GET',
        params: this.buildODataUrlParams({ filter, page, pageSize }),
      },
      connectorUsageCollector
    );

    return {
      ...response,
      page,
      pageSize,
      total: response['@odata.count'] ?? -1,
    };
  }

  public async isolateHost(
    { id, comment }: MicrosoftDefenderEndpointIsolateHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointMachineAction> {
    // API Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/isolate-machine

    return this.fetchFromMicrosoft<MicrosoftDefenderEndpointMachineAction>(
      {
        url: `${this.urls.machines}/${id}/isolate`,
        method: 'POST',
        data: {
          Comment: comment,
          IsolationType: 'Full',
        },
      },
      connectorUsageCollector
    );
  }

  public async releaseHost(
    { id, comment }: MicrosoftDefenderEndpointReleaseHostParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointMachineAction> {
    // API Reference:https://learn.microsoft.com/en-us/defender-endpoint/api/unisolate-machine

    return this.fetchFromMicrosoft<MicrosoftDefenderEndpointMachineAction>(
      {
        url: `${this.urls.machines}/${id}/unisolate`,
        method: 'POST',
        data: {
          Comment: comment,
        },
      },
      connectorUsageCollector
    );
  }

  public async runScript(
    payload: MicrosoftDefenderEndpointRunScriptParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointMachineAction> {
    // API Reference:https://learn.microsoft.com/en-us/defender-endpoint/api/run-live-response

    return this.fetchFromMicrosoft<MicrosoftDefenderEndpointMachineAction>(
      {
        url: `${this.urls.machines}/${payload.id}/runliveresponse`,
        method: 'POST',
        data: {
          Comment: payload.comment,
          Commands: [
            {
              type: 'RunScript',
              params: [
                {
                  key: 'ScriptName',
                  value: payload.parameters.scriptName,
                },
                {
                  key: 'Args',
                  value: payload.parameters.args || '--noargs',
                },
              ],
            },
          ],
        },
      },
      connectorUsageCollector
    );
  }

  public async getActions(
    {
      page = 1,
      pageSize = 20,
      sortField,
      sortDirection = 'desc',
      ...filter
    }: MicrosoftDefenderEndpointGetActionsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderEndpointGetActionsResponse> {
    // API Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/get-machineactions-collection
    // OData usage reference: https://learn.microsoft.com/en-us/defender-endpoint/api/exposed-apis-odata-samples

    const response = await this.fetchFromMicrosoft<MicrosoftDefenderEndpointGetActionsResponse>(
      {
        url: `${this.urls.machineActions}`,
        method: 'GET',
        params: this.buildODataUrlParams({ filter, page, pageSize, sortField, sortDirection }),
      },
      connectorUsageCollector
    );

    return {
      ...response,
      page,
      pageSize,
      total: response['@odata.count'] ?? -1,
    };
  }

  public async getActionResults(
    { id }: MicrosoftDefenderEndpointGetActionsParams,
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<Stream> {
    // API Reference: https://learn.microsoft.com/en-us/defender-endpoint/api/get-live-response-result

    const resultDownloadLink =
      await this.fetchFromMicrosoft<MicrosoftDefenderEndpointGetActionResultsResponse>(
        {
          url: `${this.urls.machineActions}/${id}/GetLiveResponseResultDownloadLink(index=0)`, // We want to download the first result
          method: 'GET',
        },
        connectorUsageCollector
      );
    this.logger.debug(
      () => `script results for machineId [${id}]:\n${JSON.stringify(resultDownloadLink)}`
    );

    const fileUrl = resultDownloadLink.value;

    if (!fileUrl) {
      throw new Error(`Download URL for script results of machineId [${id}] not found`);
    }
    const downloadConnection = await this.request(
      {
        url: fileUrl,
        method: 'get',
        responseType: 'stream',
        responseSchema: DownloadActionResultsResponseSchema,
      },
      connectorUsageCollector
    );
    return downloadConnection.data;
  }

  public async getLibraryFiles(
    payload: {},
    connectorUsageCollector: ConnectorUsageCollector
  ): Promise<MicrosoftDefenderGetLibraryFilesResponse> {
    // API Reference:https://learn.microsoft.com/en-us/defender-endpoint/api/list-library-files

    return this.fetchFromMicrosoft<MicrosoftDefenderGetLibraryFilesResponse>(
      {
        url: `${this.urls.libraryFiles}`,
        method: 'GET',
      },
      connectorUsageCollector
    );
  }
}

interface BuildODataUrlParamsResponse {
  $filter: string;
  $top: number;
  $skip: number;
  $count: boolean;
  $orderby: string;
}
