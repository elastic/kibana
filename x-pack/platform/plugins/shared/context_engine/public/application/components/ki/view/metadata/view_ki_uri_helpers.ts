/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { WORKFLOWS_APP_ID } from '@kbn/deeplinks-workflows';
import { isDreamingWorkflowId } from '../../../../../../common/dreaming';
import {
  KI_URI_SCHEME_TOOL,
  KI_URI_SCHEME_WORKFLOW,
  parseKiUri,
} from '../../../../../../common/ki_uri';

export type KiGetUrlForApp = (appId: string, options?: { path?: string }) => string;

export const isDreamingWorkflowUri = (uri: string): boolean => {
  const parsed = parseKiUri(uri);
  return (
    parsed?.scheme.toLowerCase() === KI_URI_SCHEME_WORKFLOW &&
    isDreamingWorkflowId(parsed.identifier)
  );
};

export const getKiUriHref = (getUrlForApp: KiGetUrlForApp, uri: string): string | undefined => {
  const parsed = parseKiUri(uri);
  if (!parsed) {
    return undefined;
  }
  const scheme = parsed.scheme.toLowerCase();
  if (scheme === KI_URI_SCHEME_WORKFLOW) {
    return getUrlForApp(WORKFLOWS_APP_ID, {
      path: `/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  if (scheme === KI_URI_SCHEME_TOOL) {
    return getUrlForApp(AGENT_BUILDER_APP_ID, {
      path: `/manage/tools/${encodeURIComponent(parsed.identifier)}`,
    });
  }
  return undefined;
};

// The link uses the current space. It cannot open the conversation if it was recorded in another space.
export const getKiConversationHref = (
  getUrlForApp: KiGetUrlForApp,
  conversationId: string
): string =>
  getUrlForApp(AGENT_BUILDER_APP_ID, {
    path: `/conversations/${encodeURIComponent(conversationId)}`,
  });
