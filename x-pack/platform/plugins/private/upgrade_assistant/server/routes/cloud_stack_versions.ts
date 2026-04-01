/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import SemVer from 'semver/classes/semver';

import { API_BASE_PATH } from '../../common/constants';
import type { CloudStackVersionInfo } from '../../common/types';
import type { RouteDependencies } from '../types';

/**
 * Cloud exposes stack upgrade information (including `upgradable_to`) via a public endpoint.
 * We proxy that data so the UI can reason about "latest available" and "upgrade path" without
 * depending on the browser to call Cloud directly.
 *
 * Notes:
 * - We keep this route unauthz'ed (public Cloud data), but it still requires Kibana authn.
 * - We treat Cloud data as best-effort once we have at least one successful lookup; however, if we
 *   cannot retrieve upgrade info at all (first hop fails), we surface an error so the UI can render
 *   "Unavailable" rather than implying "you're already on latest".
 * - For version under development, the *requested* version might not exist in the Cloud API yet,
 *   so we may need to fall back to a nearby published version to get meaningful upgrade info.
 */
const CLOUD_STACK_VERSIONS_TIMEOUT_MS = 5_000;
const CLOUD_STACK_VERSIONS_OVERALL_TIMEOUT_MS = 30_000;

const abortSignalAny = (signals: AbortSignal[]): AbortSignal => {
  const any = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (typeof any === 'function') return any(signals);

  const controller = new AbortController();
  const abort = () => {
    for (const s of signals) {
      s.removeEventListener('abort', abort);
    }
    controller.abort();
  };

  for (const s of signals) {
    if (s.aborted) {
      abort();
      break;
    }
    s.addEventListener('abort', abort, { once: true });
  }

  return controller.signal;
};

const parseSemver = (version: string): SemVer | undefined => {
  try {
    return new SemVer(version);
  } catch {
    return undefined;
  }
};

const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

const getCloudErrorCodes = (body: unknown): string[] => {
  if (!body || typeof body !== 'object') return [];

  const errors = (body as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return [];

  return errors
    .map((e) => (e && typeof e === 'object' ? (e as { code?: unknown }).code : undefined))
    .filter((code): code is string => typeof code === 'string');
};

const isVersionNotFoundBody = (body: unknown): boolean =>
  getCloudErrorCodes(body).includes('stackpack.version_not_found');

const toSemvers = (versions: string[]): SemVer[] =>
  versions.map((v) => parseSemver(v)).filter((v): v is SemVer => Boolean(v));

const maxSemver = (arr: SemVer[]): SemVer =>
  arr.reduce((a, b) => (b.compare(a) > 0 ? b : a), arr[0]);

const minSemver = (arr: SemVer[]): SemVer =>
  arr.reduce((a, b) => (b.compare(a) < 0 ? b : a), arr[0]);

const getLatestAvailableVersion = (upgradableTo: string[], currentVersion: string): string => {
  const parsed = toSemvers(upgradableTo);
  return parsed.length > 0 ? maxSemver(parsed).version : currentVersion;
};

const getUpgradableRange = (upgradableTo: string[]) => {
  const parsed = toSemvers(upgradableTo);

  if (parsed.length === 0) return undefined;

  return { min: minSemver(parsed).version, max: maxSemver(parsed).version };
};

const fetchCloudStackVersionsApi = async (
  baseUrl: string,
  version?: string,
  overallSignal?: AbortSignal
): Promise<Response> => {
  const url = version ? `${baseUrl}/${encodeURIComponent(version)}` : baseUrl;

  const signal = overallSignal
    ? abortSignalAny([overallSignal, AbortSignal.timeout(CLOUD_STACK_VERSIONS_TIMEOUT_MS)])
    : AbortSignal.timeout(CLOUD_STACK_VERSIONS_TIMEOUT_MS);

  return await fetch(url, {
    headers: { accept: 'application/json' },
    signal,
  });
};

/**
 * When a specific version lookup fails (typically 404/400 because that stack version isn't
 * published in Cloud yet), we fetch the list of published stack versions and pick the best
 * fallback (usually same-major).
 *
 * This is intentionally defensive: the Cloud response shape isn't guaranteed and should not fail the UI.
 */
const fetchPublishedCloudStackVersions = async (
  baseUrl: string,
  overallSignal?: AbortSignal
): Promise<string[]> => {
  try {
    const res = await fetchCloudStackVersionsApi(baseUrl, undefined, overallSignal);

    if (!res.ok) return [];

    const body = (await res.json()) as { stacks?: unknown };
    if (!Array.isArray(body.stacks)) return [];

    const versions: string[] = [];
    for (const s of body.stacks) {
      if (s && typeof s === 'object' && 'version' in s) {
        const v = (s as { version?: unknown }).version;
        if (typeof v === 'string') versions.push(v);
      }
    }
    return versions;
  } catch {
    return [];
  }
};

const pickBestPublishedFallback = (
  requested: SemVer | undefined,
  publishedVersions: string[]
): string | undefined => {
  const published = toSemvers(publishedVersions);

  if (published.length === 0) return undefined;

  // If we can parse the requested version, prefer versions within the same major.
  if (requested) {
    const sameMajor = published.filter((v) => v.major === requested.major);
    if (sameMajor.length > 0) {
      const notNewerThanRequested = sameMajor.filter((v) => v.compare(requested) <= 0);
      if (notNewerThanRequested.length > 0) {
        return maxSemver(notNewerThanRequested).version;
      }

      return maxSemver(sameMajor).version;
    }
  }

  return maxSemver(published).version;
};

/**
 * Resolve the latest available version by repeatedly walking the "upgrade graph":
 * - Call Cloud `/<version>` to get `upgradable_to`.
 * - Pick the highest semver from `upgradable_to` and use that as the next lookup.
 * - Stop when the next step is not newer (reached the latest) or when parsing fails.
 *
 * We also return:
 * - `minVersionToUpgradeToLatest`: the *first hop* required to eventually reach the latest.
 *   This is what the UI uses to explain "to reach X you must be at least Y first".
 * - `directUpgradeableVersionRange`: min/max of the first-hop `upgradable_to` list so the UI can show
 *   "from your current version you can upgrade to …".
 *
 * Safeguards:
 * - `seen` prevents cycles if Cloud returns unexpected data.
 * - `MAX_ITERATIONS` caps work even if Cloud returns a long chain.
 * - Any non-OK response becomes best-effort once we have at least one successful lookup. If we
 *   cannot retrieve upgrade info at all (first hop fails), we throw so the route can return 502.
 */
const resolveLatestAvailableVersion = async (
  baseUrl: string,
  startVersion: string,
  parsedForFallback: SemVer | undefined
): Promise<{
  lookupVersionUsed: string;
  latestAvailableVersion: string;
  minVersionToUpgradeToLatest?: string;
  directUpgradeableVersionRange?: { min: string; max: string };
}> => {
  const MAX_ITERATIONS = 10;
  const overallSignal = AbortSignal.timeout(CLOUD_STACK_VERSIONS_OVERALL_TIMEOUT_MS);

  const seen = new Set<string>();
  let lookupVersion = startVersion;
  let lookupVersionUsed = startVersion;
  let firstHopVersion: string | undefined;
  let directUpgradeableVersionRange: { min: string; max: string } | undefined;

  const bestEffortResult = () => ({
    lookupVersionUsed,
    latestAvailableVersion: lookupVersionUsed,
    minVersionToUpgradeToLatest: firstHopVersion,
    directUpgradeableVersionRange,
  });

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    if (seen.has(lookupVersion)) {
      break;
    }
    seen.add(lookupVersion);

    let res: Response;
    try {
      res = await fetchCloudStackVersionsApi(baseUrl, lookupVersion, overallSignal);
    } catch (e) {
      if (i === 0) {
        throw new Error(
          `Failed to retrieve stack versions from Cloud (fetch error) for ${lookupVersion}`
        );
      }
      return bestEffortResult();
    }

    if (!res.ok && (res.status === 404 || res.status === 400)) {
      let errorBody: unknown;
      try {
        errorBody = await res.json();
      } catch {
        errorBody = undefined;
      }

      // Only fall back when Cloud explicitly reports the version is missing.
      if (isVersionNotFoundBody(errorBody)) {
        const publishedVersions = await fetchPublishedCloudStackVersions(baseUrl, overallSignal);
        const parsedLookupVersion = parseSemver(lookupVersion) ?? parsedForFallback;
        const fallback =
          pickBestPublishedFallback(parsedLookupVersion, publishedVersions) ??
          pickBestPublishedFallback(parsedForFallback, publishedVersions);

        if (fallback) {
          lookupVersion = fallback;
          try {
            res = await fetchCloudStackVersionsApi(baseUrl, lookupVersion, overallSignal);
          } catch (e) {
            if (i === 0) {
              throw new Error(
                `Failed to retrieve stack versions from Cloud (fetch error) for ${lookupVersion}`
              );
            }
            return bestEffortResult();
          }
        }
      }
    }

    if (!res.ok) {
      if (i === 0) {
        throw new Error(
          `Failed to retrieve stack versions from Cloud (status ${res.status}) for ${lookupVersion}`
        );
      }

      // Fall back to the best effort version we were using.
      return bestEffortResult();
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      if (i === 0) {
        throw new Error(`Failed to parse Cloud response JSON for ${lookupVersion}`);
      }
      return bestEffortResult();
    }

    const errorCodes = getCloudErrorCodes(body);
    if (errorCodes.length > 0) {
      if (i === 0) {
        const errorCodesMessage = errorCodes.join(', ');
        throw new Error(
          `Cloud stack versions lookup returned errors for ${lookupVersion}: ${errorCodesMessage}`
        );
      }
      return bestEffortResult();
    }

    lookupVersionUsed = lookupVersion;

    const typedBody = body as { upgradable_to?: unknown };
    const upgradableTo = parseStringArray(typedBody.upgradable_to);

    if (i === 0) {
      directUpgradeableVersionRange = getUpgradableRange(upgradableTo);
    }

    const stepLatest = getLatestAvailableVersion(upgradableTo, lookupVersion);

    const stepLatestParsed = parseSemver(stepLatest);
    const lookupParsed = parseSemver(lookupVersion);
    if (!stepLatestParsed || !lookupParsed) {
      return {
        lookupVersionUsed,
        latestAvailableVersion: stepLatest,
        minVersionToUpgradeToLatest: firstHopVersion,
        directUpgradeableVersionRange,
      };
    }

    if (stepLatestParsed.compare(lookupParsed) <= 0) {
      return {
        lookupVersionUsed,
        latestAvailableVersion: lookupVersion,
        minVersionToUpgradeToLatest:
          firstHopVersion && firstHopVersion !== lookupVersion ? firstHopVersion : undefined,
        directUpgradeableVersionRange,
      };
    }

    if (i === 0) {
      firstHopVersion = stepLatestParsed.version;
    }

    lookupVersion = stepLatestParsed.version;
  }

  return {
    lookupVersionUsed,
    latestAvailableVersion: lookupVersion,
    minVersionToUpgradeToLatest:
      firstHopVersion && firstHopVersion !== lookupVersion ? firstHopVersion : undefined,
    directUpgradeableVersionRange,
  };
};

export function registerCloudStackVersionsRoute(deps: RouteDependencies) {
  const { router, log } = deps;
  const cloudStackVersionsApiBaseUrl = deps.config.cloudStackVersionsApiBaseUrl;
  router.get(
    {
      path: `${API_BASE_PATH}/cloud_stack_versions/{currentVersion}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Proxies a public Cloud endpoint; relies on Kibana authn only',
        },
      },
      validate: {
        params: schema.object({
          currentVersion: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      const requestedCurrentVersion = request.params.currentVersion;
      const requestedParsed = parseSemver(requestedCurrentVersion);
      const initialLookupVersion = requestedCurrentVersion;

      try {
        const {
          lookupVersionUsed,
          latestAvailableVersion,
          minVersionToUpgradeToLatest,
          directUpgradeableVersionRange,
        } = await resolveLatestAvailableVersion(
          cloudStackVersionsApiBaseUrl,
          initialLookupVersion,
          requestedParsed
        );

        const apiBody: CloudStackVersionInfo = {
          currentVersion: requestedCurrentVersion,
          lookupVersionUsed,
          latestAvailableVersion,
          minVersionToUpgradeToLatest,
          directUpgradeableVersionRange,
        };

        return response.ok({ body: apiBody });
      } catch (error) {
        log.error(error);
        return response.customError({
          statusCode: 502,
          body: { message: 'Failed to retrieve stack versions from Cloud.' },
        });
      }
    }
  );
}
