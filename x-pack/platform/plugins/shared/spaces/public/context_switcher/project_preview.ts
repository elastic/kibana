/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IconType } from '@elastic/eui';
import { useSyncExternalStore } from 'react';

import { i18n } from '@kbn/i18n';

/**
 * Preview targets for proposal 2.
 * Serverless types match Kibana solutions. The deployment matches the hosted environment row.
 */
export type ProjectPreviewId = 'security' | 'observability' | 'search' | 'vectordb' | 'deployment';

export interface ProjectPreview {
  id: ProjectPreviewId;
  icon: IconType;
  name: string;
  description: string;
}

const SERVERLESS_DESCRIPTION = i18n.translate(
  'xpack.spaces.contextSwitcher.projectPreview.serverlessDescription',
  { defaultMessage: 'Serverless project' }
);

const DEPLOYMENT_DESCRIPTION = i18n.translate(
  'xpack.spaces.contextSwitcher.projectPreview.deploymentDescription',
  { defaultMessage: 'Deployment' }
);

export const PROJECT_PREVIEWS: readonly ProjectPreview[] = [
  {
    id: 'security',
    icon: 'logoSecurity',
    name: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.securityName', {
      defaultMessage: 'Acme Production',
    }),
    description: SERVERLESS_DESCRIPTION,
  },
  {
    id: 'observability',
    icon: 'logoObservability',
    name: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.observabilityName', {
      defaultMessage: 'Global application monitoring',
    }),
    description: SERVERLESS_DESCRIPTION,
  },
  {
    id: 'search',
    icon: 'logoElasticsearch',
    name: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.searchName', {
      defaultMessage: 'Product catalog',
    }),
    description: SERVERLESS_DESCRIPTION,
  },
  {
    id: 'vectordb',
    icon: 'logoVectorDB',
    name: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.vectorName', {
      defaultMessage: 'Knowledge embeddings',
    }),
    description: SERVERLESS_DESCRIPTION,
  },
  {
    id: 'deployment',
    icon: 'logoElastic',
    name: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.deploymentName', {
      defaultMessage: 'My Favorite Deployment',
    }),
    description: DEPLOYMENT_DESCRIPTION,
  },
];

const STORAGE_KEY = 'kbn.contextSwitcherProjectPreview';

const isPreviewId = (value: string | null): value is ProjectPreviewId =>
  PROJECT_PREVIEWS.some((preview) => preview.id === value);

const readStoredPreview = (): ProjectPreviewId => {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (isPreviewId(stored)) {
      return stored;
    }
  } catch {
    // sessionStorage can be unavailable.
  }
  return 'security';
};

const listeners = new Set<() => void>();
let previewId: ProjectPreviewId | undefined;

export const getProjectPreviewId = (): ProjectPreviewId => {
  if (!previewId) {
    previewId = readStoredPreview();
  }
  return previewId;
};

export const getProjectPreview = (): ProjectPreview => {
  const id = getProjectPreviewId();
  return PROJECT_PREVIEWS.find((preview) => preview.id === id) ?? PROJECT_PREVIEWS[0];
};

export const setProjectPreviewId = (next: ProjectPreviewId) => {
  if (next === previewId) {
    return;
  }
  previewId = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Ignore write failures. The in-memory value still updates.
  }
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useProjectPreview = (): ProjectPreview =>
  useSyncExternalStore(subscribe, getProjectPreview, () => PROJECT_PREVIEWS[0]);
