/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { ApplicationStart } from '@kbn/core/public';
import type { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { Observable } from 'rxjs';
import { EventReporter } from '../telemetry';

/* @internal */
export interface SearchBarProps {
  globalSearch: GlobalSearchPluginStart & { searchCharLimit: number };
  navigateToUrl: ApplicationStart['navigateToUrl'];
  reportEvent: EventReporter;
  taggingApi?: SavedObjectTaggingPluginStart;
  basePathUrl: string;
  chromeStyle$: Observable<ChromeStyle>;
}
