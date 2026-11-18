/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

import { appLinkPath } from './resolve_link';

// Browsers and `sanitizeNavigationHref` drop C0 controls and DEL, so a path could pass the check
// below and still navigate elsewhere once they're gone.
const hasControlCharacter = (value: string): boolean =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
// A path that climbs out of its app can only climb back into one fixed route, so it can't stay
// inside two different apps.
const PROBE_APPS = ['probe-a', 'probe-b'] as const;

const staysInProbe = (app: string, path: string): boolean => {
  const root = appLinkPath({ app });
  try {
    const { pathname } = new URL(appLinkPath({ app, path }), 'http://kibana.invalid');
    return pathname === root || pathname.startsWith(`${root}/`);
  } catch {
    return false;
  }
};

/** Whether `path` stays inside its app once a URL parser decodes and normalizes it, as hosts do. */
const staysInApp = (path: string): boolean => PROBE_APPS.every((app) => staysInProbe(app, path));

/** A path inside a Kibana app, which can't leave it. */
export const appPathSchema = z
  .string()
  .max(2000)
  .refine((value) => /^[/?#]/.test(value) && !value.startsWith('//') && !value.includes('\\'), {
    error: 'must start with /, ? or #, and not with //',
  })
  .refine((value) => !hasControlCharacter(value), {
    error: 'must not contain control characters',
  })
  .refine(staysInApp, { error: 'must not leave the app with ..' });

/** A Kibana app route, the part of the URL after `/app/`. */
export const appRouteSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/, {
  error: 'must be a Kibana app route, such as discover',
});

/** Requires exactly one of `app` or `url`, and `path` only with `app`. */
export const refineAppOrUrl = (
  { app, path, url }: { app?: string; path?: string; url?: string },
  context: z.RefinementCtx
) => {
  if ((app === undefined) === (url === undefined)) {
    context.addIssue({
      code: 'custom',
      message: 'give exactly one of app or url',
      path: [app === undefined ? 'app' : 'url'],
    });
  }
  if (path !== undefined && app === undefined) {
    context.addIssue({ code: 'custom', message: 'needs app', path: ['path'] });
  }
};
