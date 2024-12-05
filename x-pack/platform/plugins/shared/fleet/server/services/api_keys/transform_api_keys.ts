/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CreateRestAPIKeyParams,
  CreateRestAPIKeyWithKibanaPrivilegesParams,
} from '@kbn/security-plugin/server';
import { type FakeRawRequest, type Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';

import type { Logger } from '@kbn/logging';

import { appContextService } from '..';

import type { HTTPAuthorizationHeader } from '../../../common/http_authorization_header';

import type {
  TransformAPIKey,
  SecondaryAuthorizationHeader,
} from '../../../common/types/models/transform_api_key';

export function isTransformApiKey(arg: any): arg is TransformAPIKey {
  return (
    arg &&
    Object.hasOwn(arg, 'api_key') &&
    Object.hasOwn(arg, 'encoded') &&
    typeof arg.encoded === 'string'
  );
}

function createKibanaRequestFromAuth(authorizationHeader: HTTPAuthorizationHeader) {
  const requestHeaders: Headers = {
    authorization: authorizationHeader.toString(),
  };
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };

  // Since we're using API keys and accessing elasticsearch can only be done
  // via a request, we're faking one with the proper authorization headers.
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);

  return fakeRequest;
}

/** This function generates a new API based on current Kibana's user request.headers.authorization
 * then formats it into a es-secondary-authorization header object
 * @param authorizationHeader:
 * @param createParams
 */
export async function generateTransformSecondaryAuthHeaders({
  authorizationHeader,
  createParams,
  logger,
  username,
  pkgName,
  pkgVersion,
}: {
  authorizationHeader: HTTPAuthorizationHeader | null | undefined;
  logger: Logger;
  createParams?: CreateRestAPIKeyParams | CreateRestAPIKeyWithKibanaPrivilegesParams;
  username?: string;
  pkgName?: string;
  pkgVersion?: string;
}): Promise<SecondaryAuthorizationHeader | undefined> {
  if (!authorizationHeader) {
    return;
  }

  const fakeKibanaRequest = createKibanaRequestFromAuth(authorizationHeader);

  const user = username ?? authorizationHeader.getUsername();

  const name = pkgName
    ? `${pkgName}${pkgVersion ? '-' + pkgVersion : ''}-transform${user ? '-by-' + user : ''}`
    : `fleet-transform-api-key`;

  const security = appContextService.getSecurity();

  // If security is not enabled or available, we can't generate api key
  // but that's ok, cause all the index and transform commands should work
  if (!security) return;

  try {
    const apiKeyWithCurrentUserPermission = await security?.authc.apiKeys.grantAsInternalUser(
      fakeKibanaRequest,
      createParams ?? {
        name,
        metadata: {
          managed_by: 'fleet',
          managed: true,
          type: 'transform',
        },
        role_descriptors: {},
      }
    );
    logger.debug(`Created api_key name: ${name}`);
    let encodedApiKey: TransformAPIKey['encoded'] | null = null;

    // Property 'encoded' does exist in the resp coming back from request
    // and is required to use in authentication headers
    // It's just not defined in returned GrantAPIKeyResult type
    if (isTransformApiKey(apiKeyWithCurrentUserPermission)) {
      encodedApiKey = apiKeyWithCurrentUserPermission.encoded;
    }

    const secondaryAuth =
      encodedApiKey !== null
        ? {
            headers: {
              'es-secondary-authorization': `ApiKey ${encodedApiKey}`,
            },
          }
        : undefined;

    return secondaryAuth;
  } catch (e) {
    logger.debug(`Failed to create api_key: ${name} because ${e}`);
    return undefined;
  }
}
