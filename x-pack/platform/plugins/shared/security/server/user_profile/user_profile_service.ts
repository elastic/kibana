/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SecurityActivateUserProfileRequest,
  SecurityUserProfile,
} from '@elastic/elasticsearch/lib/api/types';
import pLimit from 'p-limit';

import type { IClusterClient, Logger } from '@kbn/core/server';
import type {
  CheckUserProfilesPrivilegesResponse,
  UserProfileBulkGetParams,
  UserProfileGetCurrentParams,
  UserProfileRequiredPrivileges,
  UserProfileServiceStart,
  UserProfileSuggestParams,
} from '@kbn/security-plugin-types-server';
import type { PublicMethodsOf } from '@kbn/utility-types';

import type { UserProfileGrant } from './user_profile_grant';
import type {
  SecurityLicense,
  UserProfile,
  UserProfileData,
  UserProfileWithSecurity,
} from '../../common';
import type { AuthorizationServiceSetupInternal } from '../authorization';
import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import { getPrintableSessionId, type Session } from '../session_management';

const KIBANA_DATA_ROOT = 'kibana';
const ACTIVATION_MAX_RETRIES = 10;
const ACTIVATION_RETRY_SCALE_DURATION_MS = 150;
const MAX_SUGGESTIONS_COUNT = 100;
const DEFAULT_SUGGESTIONS_COUNT = 10;
const MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK = 10;
const BULK_GET_MAX_UIDS_PER_BATCH = 50;
const BULK_GET_MAX_CONCURRENT_BATCH_REQUESTS = 5;

export interface UserProfileServiceStartInternal extends UserProfileServiceStart {
  /**
   * Activates user profile using provided user profile grant.
   * @param grant User profile grant (username/password or access token).
   */
  activate(grant: UserProfileGrant): Promise<UserProfileWithSecurity>;

  /**
   * Updates user preferences by identifier.
   * @param uid User ID
   * @param data Application data to be written (merged with existing data).
   */
  update<D extends UserProfileData>(uid: string, data: D): Promise<void>;
}

export interface UserProfileServiceSetupParams {
  authz: AuthorizationServiceSetupInternal;
  license: SecurityLicense;
}

export interface UserProfileServiceStartParams {
  clusterClient: IClusterClient;
  session: PublicMethodsOf<Session>;
}

function parseUserProfile<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): UserProfile<D> {
  return {
    uid: rawUserProfile.uid,
    // Get User Profile API returns `enabled` property, but Suggest User Profile API doesn't since it's assumed that the
    // API returns only enabled profiles. To simplify the API in Kibana we use the same interfaces for user profiles
    // irrespective to the source they are coming from, so we need to "normalize" `enabled` property here.
    enabled: rawUserProfile.enabled ?? true,
    data: rawUserProfile.data?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      username: rawUserProfile.user.username,
      // @elastic/elasticsearch types support `null` values for the `email`, but we don't.
      email: rawUserProfile.user.email ?? undefined,
      // @elastic/elasticsearch types support `null` values for the `full_name`, but we don't.
      full_name: rawUserProfile.user.full_name ?? undefined,
    },
  };
}

function parseUserProfileWithSecurity<D extends UserProfileData>(
  rawUserProfile: SecurityUserProfile
): UserProfileWithSecurity<D> {
  const userProfile = parseUserProfile<D>(rawUserProfile);
  return {
    ...userProfile,
    labels: rawUserProfile.labels?.[KIBANA_DATA_ROOT] ?? {},
    user: {
      ...userProfile.user,
      roles: rawUserProfile.user.roles,
      realm_name: rawUserProfile.user.realm_name,
      realm_domain: rawUserProfile.user.realm_domain,
    },
  };
}

export class UserProfileService {
  private authz?: AuthorizationServiceSetupInternal;
  private license?: SecurityLicense;
  constructor(private readonly logger: Logger) {}

  setup({ authz, license }: UserProfileServiceSetupParams) {
    this.authz = authz;
    this.license = license;
  }

  start({ clusterClient, session }: UserProfileServiceStartParams) {
    return {
      activate: this.activate.bind(this, clusterClient),
      getCurrent: this.getCurrent.bind(this, clusterClient, session),
      bulkGet: this.bulkGet.bind(this, clusterClient),
      update: this.update.bind(this, clusterClient),
      suggest: this.suggest.bind(this, clusterClient),
    } as UserProfileServiceStartInternal;
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async activate(clusterClient: IClusterClient, grant: UserProfileGrant) {
    this.logger.debug(`Activating user profile via ${grant.type} grant.`);

    const activateRequest: SecurityActivateUserProfileRequest =
      grant.type === 'password'
        ? { grant_type: 'password', username: grant.username, password: grant.password }
        : {
            grant_type: 'access_token',
            access_token: grant.accessToken,
            ...(grant.type === 'uiamAccessToken'
              ? { client_authentication: { scheme: 'SharedSecret', value: grant.sharedSecret } }
              : {}),
          };

    // Profile activation is a multistep process that might or might not cause profile document to be created or
    // updated. If Elasticsearch needs to handle multiple profile activation requests for the same user in parallel
    // it can hit document version conflicts and fail (409 status code). In this case it's safe to retry activation
    // request after some time. Most of the Kibana users won't be affected by this issue, but there are edge cases
    // when users can be hit by the conflicts during profile activation, e.g. for PKI or Kerberos authentication when
    // client certificate/ticket changes and multiple requests can trigger profile re-activation at the same time.
    let activationRetriesLeft = ACTIVATION_MAX_RETRIES;
    do {
      try {
        console.log(`***** activateRequest: ${JSON.stringify(activateRequest)}`);
        const response = await clusterClient.asInternalUser.security.activateUserProfile({
          ...activateRequest,
          // querystring: { data: prefixCommaSeparatedValues('*', KIBANA_DATA_ROOT) },
        });

        this.logger.debug(`Successfully activated profile for "${response.user.username}".`);

        console.log(`***** activate RAW USER PROFILE: ${JSON.stringify(response)}`);

        return parseUserProfileWithSecurity<{}>(response);
      } catch (err) {
        console.log(`***** err: ${err.toString()}`);

        const detailedErrorMessage = getDetailedErrorMessage(err);
        const statusCode = getErrorStatusCode(err);
        // Retry on 409 (conflict) and 503 (service unavailable) errors
        if (statusCode !== 409 && statusCode !== 503) {
          this.logger.error(`Failed to activate user profile: ${detailedErrorMessage}.`);
          throw err;
        }

        activationRetriesLeft--;
        this.logger.error(
          `Failed to activate user profile (retries left: ${activationRetriesLeft}): ${detailedErrorMessage}.`
        );

        if (activationRetriesLeft === 0) {
          throw err;
        }
      }

      await new Promise((resolve) =>
        setTimeout(
          resolve,
          (ACTIVATION_MAX_RETRIES - activationRetriesLeft) * ACTIVATION_RETRY_SCALE_DURATION_MS
        )
      );
    } while (activationRetriesLeft > 0);

    // This should be unreachable code, unless we have a bug in retry handling logic.
    throw new Error('Failed to activate user profile, max retries exceeded.');
  }

  /**
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async getCurrent<D extends UserProfileData>(
    clusterClient: IClusterClient,
    session: PublicMethodsOf<Session>,
    { request, dataPath }: UserProfileGetCurrentParams
  ) {
    // === UNAUTHENTICATED REQUEST ====================================================================
    // If the request is not authenticated, then this function should not attempt to return a profile.
    if (request.auth.isAuthenticated === false) {
      this.logger.debug('Request is not authenticated, returning null for current user profile.');
      return null;
    }

    let profileId: string | undefined;
    let userSession;

    const hasCookieHeader =
      (request.headers.cookie || request.headers.Cookie || request.headers.COOKIE) !== undefined;

    const authHeader =
      request.headers.Authorization ||
      request.headers.authorization ||
      request.headers.AUTHORIZATION;

    // console.log(`***** request: ${JSON.stringify(request, null, 2)}`);
    // console.log(`***** request.headers: ${JSON.stringify(request.headers, null, 2)}`);
    console.log(`***** has cookie header: ${hasCookieHeader}`);
    console.log(`***** authHeader: ${authHeader}`);

    // === SESSION =======================================================================================
    // If the request is associated with a session (no authc header), then the current logic will suffice.
    if (hasCookieHeader) {
      try {
        userSession = await session.get(request);
      } catch (error) {
        this.logger.error(`Failed to retrieve user session: ${getDetailedErrorMessage(error)}`);
        throw error;
      }

      // ToDo: what is the execution flow with anonymous access?
      // export enum SessionErrorReason {
      //   'SESSION_MISSING' = 'SESSION_MISSING',
      //   'SESSION_EXPIRED' = 'SESSION_EXPIRED',
      //   'CONCURRENCY_LIMIT' = 'CONCURRENCY_LIMIT',
      //   'UNEXPECTED_SESSION_ERROR' = 'UNEXPECTED_SESSION_ERROR',
      // }

      if (userSession.error) {
        console.log(`***** User session error: ${userSession.error.message}`);
        return null;
      }

      profileId = userSession.value.userProfileId;

      if (!profileId) {
        this.logger.debug(
          `User profile missing from the current session [sid=${getPrintableSessionId(
            userSession.value.sid
          )}].`
        );
        console.log(`***** User profile missing`);
        return null;
      }
    }

    // === NON SESSION =================================================================================
    // If the request is authenticated with an 'Authorization' header (and therefore not a session), then:
    else if (authHeader && typeof authHeader === 'string') {
      // Determine if it is basic or API key...
      const isBasicAuth = authHeader.trim().toLowerCase().startsWith('basic ');
      const isApiKeyAuth = authHeader.trim().toLowerCase().startsWith('apikey ');

      // === BASIC AUTHC ================================================================================
      // Requests authenticated via Basic auth need to have their profile activated. We can then return
      // the profile from the activation call.
      if (isBasicAuth) {
        this.logger.debug('Request is authenticated via Basic auth, activating user profile...');
        const base64Credentials = authHeader.trim().substring('basic '.length);
        const credentials = Buffer.from(base64Credentials, 'base64').toString().split(':');
        console.log(`***** credentials: ${JSON.stringify(credentials)}`);
        const username = credentials[0] || '';
        const password = credentials[1] || '';

        // ToDo: figure out how to filter dataPath on activate
        const activatedProfile = await this.activate(clusterClient, {
          type: 'password',
          username,
          password,
        }); // ToDo: catch and wrap error?

        profileId = activatedProfile.uid;
      }

      // === API KEY ======================================================================================
      // Requests authenticated via ApiKey need to have their profile id retrieved from the API Key itself.
      // Using an ES Client scoped with the ApiKey credentials, we can call
      // /_security/api_key?with_profile_uid=true to retrieve the profile id associated with the API Key.
      // Important: This step may fail, or may succeed but not return a profile id. We will need to
      // gracefully handle both of these scenarios.
      else if (isApiKeyAuth) {
        this.logger.debug(
          'Request is authenticated via API key, getting the profile ID for the API key...'
        );

        try {
          const response = await clusterClient.asScoped(request).asCurrentUser.security.getApiKey({
            with_profile_uid: true,
          });

          if (response.api_keys && response.api_keys.length > 0) {
            profileId = response.api_keys[0].profile_uid;
          }
        } catch (error) {
          console.log(`***** API key error: ${JSON.stringify(error)}`);
          this.logger.error(
            `Failed to retrieve API key for user profile retrieval: ${getDetailedErrorMessage(
              error
            )}`
          );
          // throw error; // Gracefully return null instead of throwing
        }
      }
    }

    // === GET THE PROFILE ===============================================================================
    if (!profileId) {
      return null;
    }

    let body;
    console.log(`***** dataPath: ${dataPath}`);
    try {
      body = await clusterClient.asInternalUser.security.getUserProfile({
        uid: profileId,
        data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
      });
    } catch (error) {
      this.logger.error(
        `Failed to retrieve user profile for the current user${
          userSession ? ` [sid=${getPrintableSessionId(userSession.value.sid)}]` : ''
        }: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }

    if (body.profiles.length === 0) {
      this.logger.error(
        `The user profile for the current user${
          userSession ? ` [sid=${getPrintableSessionId(userSession.value.sid)}]` : ''
        } is not found.`
      );
      throw new Error(`User profile is not found.`);
    }

    return parseUserProfileWithSecurity<D>(body.profiles[0]);
  }

  /**
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async bulkGet<D extends UserProfileData>(
    clusterClient: IClusterClient,
    { uids, dataPath }: UserProfileBulkGetParams
  ): Promise<Array<UserProfile<D>>> {
    if (uids.size === 0) {
      return [];
    }

    const uidArray = [...uids];

    // Because the Bulk Get User Profile API is a GET there is a limit on how many UIDs we can pass in a single request.
    // To avoid hitting the limit we split UIDs into batches and perform multiple requests if needed
    const batches = [];
    for (let i = 0; i < uidArray.length; i += BULK_GET_MAX_UIDS_PER_BATCH) {
      batches.push(uidArray.slice(i, i + BULK_GET_MAX_UIDS_PER_BATCH));
    }

    try {
      const limit = pLimit(BULK_GET_MAX_CONCURRENT_BATCH_REQUESTS);
      const batchPromises = batches.map((batchUids) => {
        return limit(async () => {
          const body = await clusterClient.asInternalUser.security.getUserProfile({
            uid: batchUids.join(','),
            data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
          });
          return body.profiles.map((rawUserProfile) => parseUserProfile<D>(rawUserProfile));
        });
      });

      const batchResults = await Promise.all(batchPromises);
      return batchResults.flat();
    } catch (error) {
      this.logger.error(`Failed to bulk get user profiles: ${getDetailedErrorMessage(error)}`);
      throw error;
    }
  }

  /**
   * See {@link UserProfileServiceStartInternal} for documentation.
   */
  private async update<D extends UserProfileData>(
    clusterClient: IClusterClient,
    uid: string,
    data: D
  ) {
    try {
      await clusterClient.asInternalUser.security.updateUserProfileData({
        uid,
        data: { [KIBANA_DATA_ROOT]: data },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update user profile [uid=${uid}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }
  }

  /**
   * See {@link UserProfileServiceStart} for documentation.
   */
  private async suggest<D extends UserProfileData>(
    clusterClient: IClusterClient,
    params: UserProfileSuggestParams
  ): Promise<Array<UserProfile<D>>> {
    if (!this.license?.getFeatures().allowUserProfileCollaboration) {
      throw Error("Current license doesn't support user profile collaboration APIs.");
    }

    const { name, hint, size = DEFAULT_SUGGESTIONS_COUNT, dataPath, requiredPrivileges } = params;
    if (size > MAX_SUGGESTIONS_COUNT) {
      throw Error(
        `Can return up to ${MAX_SUGGESTIONS_COUNT} suggestions, but ${size} suggestions were requested.`
      );
    }

    // 1. If privileges are not defined, request as many results as has been requested
    // 2. If privileges are defined, request two times more suggestions than requested to account
    // for the results that don't pass privileges check, but not less than minimal batch size
    // used to perform privileges check (fetching is cheap, privileges check is not).
    const numberOfResultsToRequest =
      (requiredPrivileges?.privileges.kibana.length ?? 0) > 0
        ? Math.max(size * 2, MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK)
        : size;

    try {
      const body = await clusterClient.asInternalUser.security.suggestUserProfiles({
        name,
        size: numberOfResultsToRequest,
        hint,
        // If fetching data turns out to be a performance bottleneck, we can try to fetch data
        // only for the profiles that pass privileges check as a separate bulkGet request.
        data: dataPath ? prefixCommaSeparatedValues(dataPath, KIBANA_DATA_ROOT) : undefined,
      });

      const filteredProfiles =
        requiredPrivileges && requiredPrivileges?.privileges.kibana.length > 0
          ? await this.filterProfilesByPrivileges(body.profiles, requiredPrivileges, size)
          : body.profiles;
      return filteredProfiles.map((rawProfile) => parseUserProfile<D>(rawProfile));
    } catch (error) {
      this.logger.error(
        `Failed to get user profiles suggestions [name=${name}]: ${getDetailedErrorMessage(error)}`
      );
      throw error;
    }
  }

  private async filterProfilesByPrivileges(
    profilesToFilter: SecurityUserProfile[],
    requiredPrivileges: UserProfileRequiredPrivileges,
    requiredSize: number
  ): Promise<SecurityUserProfile[]> {
    // First try to check privileges for the maximum amount of profiles prioritizing a happy path i.e. first
    // `requiredSize` profiles have all necessary privileges. Otherwise, check privileges for the remaining profiles in
    // reasonably sized batches to optimize network round-trips until we find `requiredSize` profiles with necessary
    // privileges, or we check all returned profiles.
    const filteredProfiles = [];
    while (profilesToFilter.length > 0 && filteredProfiles.length < requiredSize) {
      const profilesBatch: Map<string, SecurityUserProfile> = new Map(
        profilesToFilter
          .splice(
            0,
            Math.max(requiredSize - filteredProfiles.length, MIN_SUGGESTIONS_FOR_PRIVILEGES_CHECK)
          )
          .map((profile) => [profile.uid, profile])
      );

      const profileUidsToFilter = new Set(profilesBatch.keys());
      let response: CheckUserProfilesPrivilegesResponse;
      try {
        response = await this.authz!.checkUserProfilesPrivileges(profileUidsToFilter).atSpace(
          requiredPrivileges.spaceId,
          requiredPrivileges.privileges
        );
      } catch (error) {
        this.logger.error(
          `Failed to check required privileges for the suggested profiles: ${getDetailedErrorMessage(
            error
          )}`
        );
        throw error;
      }

      const unknownUids = [];
      for (const profileUid of response.hasPrivilegeUids) {
        const filteredProfile = profilesBatch.get(profileUid);
        // We check privileges in batches and the batch can have more users than requested. We ignore "excessive" users,
        // but still iterate through entire batch to collect and report all unknown uids.
        if (filteredProfile && filteredProfiles.length < requiredSize) {
          filteredProfiles.push(filteredProfile);
        } else if (!filteredProfile) {
          unknownUids.push(profileUid);
        }
      }

      // Log unknown profile UIDs.
      if (unknownUids.length > 0) {
        this.logger.error(`Privileges check API returned unknown profile UIDs: ${unknownUids}.`);
      }

      // Log profile UIDs and reason for which an error was encountered.
      if (response.errors?.count) {
        const uids = Object.keys(response.errors.details);

        for (const uid of uids) {
          this.logger.error(
            `Privileges check API failed for UID ${uid} because ${response.errors.details[uid].reason}.`
          );
        }
      }
    }

    return filteredProfiles;
  }
}

/**
 * Returns string of comma separated values prefixed with `prefix`.
 * @param str String of comma separated values
 * @param prefix Prefix to use prepend to each value
 */
export function prefixCommaSeparatedValues(str: string, prefix: string) {
  return str
    .split(',')
    .reduce<string[]>((accumulator, value) => {
      const trimmedValue = value.trim();
      if (trimmedValue) {
        accumulator.push(`${prefix}.${trimmedValue}`);
      }
      return accumulator;
    }, [])
    .join(',');
}
