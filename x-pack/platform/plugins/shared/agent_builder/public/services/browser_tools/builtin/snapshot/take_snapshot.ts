/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { AppStatus } from '@kbn/core/public';
import type { BuiltinToolDeps } from '../types';
import { buildPageSnapshot } from './build_page_snapshot';

const MAX_APPS = 60;

/** Builds the snapshot of the current page, shared by all builtin snapshot-returning tools. */
export const takeSnapshot = async ({
  application,
  refStore,
  document: doc = window.document,
}: BuiltinToolDeps): Promise<string> => {
  const [currentAppId, applications] = await Promise.all([
    firstValueFrom(application.currentAppId$),
    firstValueFrom(application.applications$),
  ]);
  const apps = [...applications.values()]
    .filter((app) => app.status === AppStatus.accessible && app.visibleIn.length > 0)
    .map(({ id, title }) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, MAX_APPS);
  return buildPageSnapshot({ root: doc.body, refStore, currentAppId, apps });
};
