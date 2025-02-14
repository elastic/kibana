/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useState } from 'react';

import type { SendRequestResponse } from '@kbn/es-ui-shared-plugin/public';

import { epmRouteService, isVerificationError } from '../../services';
import type {
  GetCategoriesRequest,
  GetCategoriesResponse,
  GetPackagesRequest,
  GetPackagesResponse,
  GetLimitedPackagesResponse,
  GetInfoResponse,
  InstallPackageResponse,
  DeletePackageRequest,
  DeletePackageResponse,
  UpdatePackageRequest,
  UpdatePackageResponse,
  GetBulkAssetsRequest,
  GetBulkAssetsResponse,
  GetVerificationKeyIdResponse,
  GetInputsTemplatesRequest,
  GetInputsTemplatesResponse,
} from '../../types';
import type {
  FleetErrorResponse,
  GetEpmDataStreamsResponse,
  GetStatsResponse,
} from '../../../common/types';
import { API_VERSIONS } from '../../../common/constants';

import { getCustomIntegrations } from '../../services/custom_integrations';

import { useConfirmOpenUnverified } from '../../applications/integrations/hooks/use_confirm_open_unverified';

import type { RequestError } from './use_request';
import { useRequest, sendRequest, sendRequestForRq } from './use_request';

export function useGetAppendCustomIntegrationsQuery() {
  return useQuery(['get-append-custom-integrations'], () => {
    const customIntegrations = getCustomIntegrations();
    return customIntegrations.getAppendCustomIntegrations();
  });
}

export function useGetReplacementCustomIntegrationsQuery() {
  return useQuery(['get-replacemenet-custom-integrations'], () => {
    const customIntegrations = getCustomIntegrations();
    return customIntegrations.getReplacementCustomIntegrations();
  });
}

export function useGetCategoriesQuery(query: GetCategoriesRequest['query'] = {}) {
  return useQuery<GetCategoriesResponse, RequestError>(
    ['categories', query],
    () =>
      sendRequestForRq<GetCategoriesResponse>({
        path: epmRouteService.getCategoriesPath(),
        method: 'get',
        query,
        version: API_VERSIONS.public.v1,
      }),
    { retry: (_, error) => !isRegistryConnectionError(error), refetchOnWindowFocus: false }
  );
}

export const sendGetCategories = (query: GetCategoriesRequest['query'] = {}) => {
  return sendRequest<GetCategoriesResponse>({
    path: epmRouteService.getCategoriesPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
};

export const useGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return useRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
};

export const useGetPackagesQuery = (
  query: GetPackagesRequest['query'],
  options?: { enabled?: boolean }
) => {
  return useQuery<GetPackagesResponse, RequestError>({
    queryKey: ['get-packages', query],
    queryFn: () =>
      sendRequestForRq<GetPackagesResponse>({
        path: epmRouteService.getListPath(),
        method: 'get',
        version: API_VERSIONS.public.v1,
        query,
      }),
    enabled: options?.enabled,
    retry: (_, error) => !isRegistryConnectionError(error),
    refetchOnWindowFocus: false,
  });
};

export const sendGetPackages = (query: GetPackagesRequest['query'] = {}) => {
  return sendRequest<GetPackagesResponse>({
    path: epmRouteService.getListPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query,
  });
};

export const useGetLimitedPackages = () => {
  return useRequest<GetLimitedPackagesResponse>({
    path: epmRouteService.getListLimitedPath(),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const useGetPackageInfoByKeyQuery = (
  pkgName: string,
  pkgVersion?: string,
  options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
    withMetadata?: boolean;
  },
  // Additional options for the useQuery hook
  queryOptions: {
    // If enabled is false, the query will not be fetched
    enabled?: boolean;
    refetchOnMount?: boolean | 'always';
  } = {
    enabled: true,
  }
) => {
  const confirmOpenUnverified = useConfirmOpenUnverified();
  const [ignoreUnverifiedQueryParam, setIgnoreUnverifiedQueryParam] = useState(
    options?.ignoreUnverified
  );

  const response = useQuery<GetInfoResponse, RequestError>(
    [pkgName, pkgVersion, options],
    () =>
      sendRequestForRq<GetInfoResponse>({
        path: epmRouteService.getInfoPath(pkgName, pkgVersion),
        method: 'get',
        version: API_VERSIONS.public.v1,
        query: {
          ...options,
          ...(ignoreUnverifiedQueryParam && { ignoreUnverified: ignoreUnverifiedQueryParam }),
        },
      }),
    {
      enabled: queryOptions.enabled,
      refetchOnMount: queryOptions.refetchOnMount,
      retry: (_, error) => !isRegistryConnectionError(error),
      refetchOnWindowFocus: false,
    }
  );

  const confirm = async () => {
    const forceInstall = await confirmOpenUnverified(pkgName);

    if (forceInstall) {
      setIgnoreUnverifiedQueryParam(true);
    }
  };

  if (response?.error && isVerificationError(response?.error)) {
    confirm();
  }

  return response;
};

export const useGetPackageStats = (pkgName: string) => {
  return useRequest<GetStatsResponse>({
    path: epmRouteService.getStatsPath(pkgName),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const useGetPackageVerificationKeyId = () => {
  const { data, ...rest } = useQuery<GetVerificationKeyIdResponse, RequestError>(
    ['verification_key_id'],
    () =>
      sendRequestForRq<GetVerificationKeyIdResponse>({
        path: epmRouteService.getVerificationKeyIdPath(),
        method: 'get',
        version: API_VERSIONS.public.v1,
      })
  );

  return {
    packageVerificationKeyId: data?.id || undefined,
    ...rest,
  };
};

export const sendGetPackageInfoByKey = (
  pkgName: string,
  pkgVersion?: string,
  options?: {
    ignoreUnverified?: boolean;
    prerelease?: boolean;
    full?: boolean;
  }
) => {
  return sendRequest<GetInfoResponse>({
    path: epmRouteService.getInfoPath(pkgName, pkgVersion),
    method: 'get',
    version: API_VERSIONS.public.v1,
    query: options,
  });
};

export const useGetFileByPath = (filePath: string) => {
  return useRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const useGetFileByPathQuery = (filePath: string) => {
  return useQuery<SendRequestResponse<string>, RequestError>(['get-file', filePath], () =>
    sendRequest<string>({
      path: epmRouteService.getFilePath(filePath),
      method: 'get',
      version: API_VERSIONS.public.v1,
    })
  );
};

export const useGetEpmDatastreams = () => {
  return useQuery<GetEpmDataStreamsResponse, RequestError>(['get-epm-datastreams'], () =>
    sendRequestForRq<GetEpmDataStreamsResponse>({
      path: epmRouteService.getDatastreamsPath(),
      method: 'get',
      version: API_VERSIONS.public.v1,
    })
  );
};

export const sendGetFileByPath = (filePath: string) => {
  return sendRequest<string>({
    path: epmRouteService.getFilePath(filePath),
    method: 'get',
    version: API_VERSIONS.public.v1,
  });
};

export const sendInstallPackage = (pkgName: string, pkgVersion: string, force: boolean = false) => {
  const body = force ? { force } : undefined;
  return sendRequest<InstallPackageResponse, FleetErrorResponse>({
    path: epmRouteService.getInstallPath(pkgName, pkgVersion),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
};

export const sendBulkInstallPackages = (
  packages: Array<string | { name: string; version: string }>
) => {
  return sendRequest<InstallPackageResponse, FleetErrorResponse>({
    path: epmRouteService.getBulkInstallPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: {
      packages,
    },
  });
};

export function sendRemovePackage(
  { pkgName, pkgVersion }: DeletePackageRequest['params'],
  query?: DeletePackageRequest['query']
) {
  return sendRequest<DeletePackageResponse>({
    path: epmRouteService.getRemovePath(pkgName, pkgVersion),
    method: 'delete',
    version: API_VERSIONS.public.v1,
    query,
  });
}

export const sendRequestReauthorizeTransforms = (
  pkgName: string,
  pkgVersion: string,
  transforms: Array<{ transformId: string }>
) => {
  return sendRequest<InstallPackageResponse, FleetErrorResponse>({
    path: epmRouteService.getReauthorizeTransformsPath(pkgName, pkgVersion),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body: { transforms },
  });
};

interface UpdatePackageArgs {
  pkgName: string;
  pkgVersion: string;
  body: UpdatePackageRequest['body'];
}

interface InstallKibanaAssetsArgs {
  pkgName: string;
  pkgVersion: string;
}

export const useUpdatePackageMutation = () => {
  return useMutation<UpdatePackageResponse, RequestError, UpdatePackageArgs>(
    ({ pkgName, pkgVersion, body }: UpdatePackageArgs) =>
      sendRequestForRq<UpdatePackageResponse>({
        path: epmRouteService.getUpdatePath(pkgName, pkgVersion),
        method: 'put',
        version: API_VERSIONS.public.v1,
        body,
      })
  );
};

export const useInstallKibanaAssetsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<any, RequestError, InstallKibanaAssetsArgs>({
    mutationFn: ({ pkgName, pkgVersion }: InstallKibanaAssetsArgs) =>
      sendRequestForRq({
        path: epmRouteService.getInstallKibanaAssetsPath(pkgName, pkgVersion),
        method: 'post',
        version: API_VERSIONS.public.v1,
      }),
    onSuccess: (data, { pkgName, pkgVersion }) => {
      return queryClient.invalidateQueries([pkgName, pkgVersion]);
    },
  });
};

export const sendUpdatePackage = (
  pkgName: string,
  pkgVersion: string,
  body: UpdatePackageRequest['body']
) => {
  return sendRequest<UpdatePackageResponse>({
    path: epmRouteService.getUpdatePath(pkgName, pkgVersion),
    method: 'put',
    version: API_VERSIONS.public.v1,
    body,
  });
};

export const sendGetBulkAssets = (body: GetBulkAssetsRequest['body']) => {
  return sendRequest<GetBulkAssetsResponse>({
    path: epmRouteService.getBulkAssetsPath(),
    method: 'post',
    version: API_VERSIONS.public.v1,
    body,
  });
};

export function useGetInputsTemplatesQuery(
  { pkgName, pkgVersion }: GetInputsTemplatesRequest['params'],
  query: GetInputsTemplatesRequest['query']
) {
  return useQuery<GetInputsTemplatesResponse, RequestError>(
    ['inputsTemplates', pkgName, pkgVersion, query],
    () =>
      sendRequestForRq<GetInputsTemplatesResponse>({
        path: epmRouteService.getInputsTemplatesPath(pkgName, pkgVersion),
        method: 'get',
        query,
        version: API_VERSIONS.public.v1,
      })
  );
}

function isRegistryConnectionError(error: RequestError) {
  return error.statusCode === 502;
}
