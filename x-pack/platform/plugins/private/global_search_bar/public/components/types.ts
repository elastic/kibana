/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart } from '@kbn/core/public';
import type { GlobalSearchPluginStart } from '@kbn/global-search-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { Observable } from 'rxjs';
import type { ChromeStyle } from '@kbn/core-chrome-browser';
import type { EventReporter } from '../telemetry';

export const SEARCH_MODAL_SELECTOR_PREFIX = 'chromeProjectNextSearchModal';
export const SEARCH_MODAL_HEIGHT = 50;
export const SEARCH_MODAL_WIDTH = 800;
export const SEARCH_MODAL_ROW_HEIGHT = 68;
export const SEARCH_MODAL_KEYBOARD_SHORTCUT = '/';

/* @internal */
export interface SearchProps {
  globalSearch: GlobalSearchPluginStart & { searchCharLimit: number };
  navigateToUrl: ApplicationStart['navigateToUrl'];
  reportEvent: EventReporter;
  taggingApi?: SavedObjectTaggingPluginStart;
  basePathUrl: string;
}

/* @internal */
export interface SearchBarProps extends SearchProps {
  chromeStyle$: Observable<ChromeStyle>;
}
/* @internal */
export interface SearchModalProps extends SearchProps {
  onClose: () => void;
}
