/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath } from '@kbn/core-http-server';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import {
  CASE_VIEW_COMMENT_PATH,
  CASE_VIEW_PATH,
  CASE_VIEW_TAB_PATH,
  GENERAL_CASES_OWNER,
  OWNER_INFO,
} from '../../common/constants';
import type { CASE_VIEW_PAGE_TABS } from '../../common/types';
import { isValidOwner } from '../../common/utils/owner';

export const getCaseViewPath = (params: {
  publicBaseUrl: NonNullable<IBasePath['publicBaseUrl']>;
  spaceId: string;
  caseId: string;
  owner: string;
  commentId?: string;
  tabId?: CASE_VIEW_PAGE_TABS;
}): string => {
  const normalizePath = (path: string): string => path.replaceAll('//', '/');
  const removeEndingSlash = (path: string): string =>
    path.endsWith('/') ? path.slice(0, -1) : path;

  const { publicBaseUrl, caseId, owner, commentId, tabId, spaceId } = params;

  const publicBaseUrlWithoutEndingSlash = removeEndingSlash(publicBaseUrl);
  const publicBaseUrlWithSpace = addSpaceIdToPath(publicBaseUrlWithoutEndingSlash, spaceId);
  const ownerInfo = isValidOwner(owner) ? OWNER_INFO[owner] : OWNER_INFO[GENERAL_CASES_OWNER];
  const basePath = `${publicBaseUrlWithSpace}${ownerInfo.appBasePath}${ownerInfo.casesBasePath}`;

  if (commentId) {
    const commentPath = normalizePath(
      CASE_VIEW_COMMENT_PATH.replace(':detailName', caseId).replace(':commentId', commentId)
    );

    return `${basePath}${commentPath}`;
  }

  if (tabId) {
    const tabPath = normalizePath(
      CASE_VIEW_TAB_PATH.replace(':detailName', caseId).replace(':tabId', tabId)
    );

    return `${basePath}${tabPath}`;
  }

  return `${basePath}${normalizePath(CASE_VIEW_PATH.replace(':detailName', caseId))}`;
};
