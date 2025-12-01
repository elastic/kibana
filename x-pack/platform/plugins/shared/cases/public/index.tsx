/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';
import { CasesUiPlugin } from './plugin';

export function plugin(initializerContext: PluginInitializerContext) {
  return new CasesUiPlugin(initializerContext);
}

export { DRAFT_COMMENT_STORAGE_ID } from './components/markdown_editor/plugins/lens/constants';

export type { CasesPublicStart, CasesPublicSetup } from './types';
export type { GetCreateCaseFlyoutProps } from './client/ui/get_create_case_flyout';
export type { GetAllCasesSelectorModalProps } from './client/ui/get_all_cases_selector_modal';
export type { GetRecentCasesProps } from './client/ui/get_recent_cases';

export type { CaseAttachments, CaseAttachmentsWithoutOwner } from './types';

export type { ICasesDeepLinkId } from './common/navigation';
export { getCasesDeepLinks, CasesDeepLinkId, generateCaseViewPath } from './common/navigation';
