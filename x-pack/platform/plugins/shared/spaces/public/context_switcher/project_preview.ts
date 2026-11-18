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

/** Same marks and names as the space solution badge. */
const HOSTED_SPACE_SOLUTIONS: ReadonlyArray<{ id: string; icon: IconType; label: string }> = [
  {
    id: 'security',
    icon: 'logoSecurity',
    label: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.solutionSecurity', {
      defaultMessage: 'Security',
    }),
  },
  {
    id: 'oblt',
    icon: 'logoObservability',
    label: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.solutionObservability', {
      defaultMessage: 'Observability',
    }),
  },
  {
    id: 'es',
    icon: 'logoElasticsearch',
    label: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.solutionElasticsearch', {
      defaultMessage: 'Elasticsearch',
    }),
  },
  {
    id: 'vectordb',
    icon: 'logoVectorDB',
    label: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.solutionVector', {
      defaultMessage: 'VectorDB',
    }),
  },
  {
    id: 'classic',
    icon: 'logoElasticStack',
    label: i18n.translate('xpack.spaces.contextSwitcher.projectPreview.solutionClassic', {
      defaultMessage: 'Classic',
    }),
  },
];

const HOSTED_SOLUTION_ALIASES: Record<string, string> = {
  observability: 'oblt',
  search: 'es',
};

const HOSTED_SOLUTION_ROTATION = ['security', 'oblt', 'es', 'classic', 'vectordb'] as const;

/**
 * Solution mark for a space on a hosted deployment.
 * Uses the space's own solution when it has one. Otherwise cycles the hosted types
 * so a serverless checkout can still review every logo.
 */
export const resolveHostedSpaceSolution = (
  solution: string | undefined,
  index: number
): { icon: IconType; label: string } => {
  const solutionId = solution ? HOSTED_SOLUTION_ALIASES[solution] ?? solution : undefined;
  const known = solutionId
    ? HOSTED_SPACE_SOLUTIONS.find((item) => item.id === solutionId)
    : undefined;
  if (known) {
    return known;
  }
  const fallbackId = HOSTED_SOLUTION_ROTATION[index % HOSTED_SOLUTION_ROTATION.length];
  return HOSTED_SPACE_SOLUTIONS.find((item) => item.id === fallbackId) ?? HOSTED_SPACE_SOLUTIONS[0];
};

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
