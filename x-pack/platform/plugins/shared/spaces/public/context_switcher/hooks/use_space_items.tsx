/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonCircle } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import React, { lazy, Suspense, useMemo } from 'react';

import type { SpaceItem } from '@kbn/context-switcher-components';
import { i18n } from '@kbn/i18n';

import type { Space } from '../../../common';
import { getSpaceAvatarComponent } from '../../space_avatar';
import { SpaceSolutionBadge } from '../../space_solution_badge';

const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

type SolutionKey = NonNullable<Space['solution']> | 'observability' | 'search';

const ES_SOLUTION = {
  iconType: 'logoElasticsearch' as const,
  label: i18n.translate('xpack.spaces.solutionViewInfo.elasticsearch', {
    defaultMessage: 'Elasticsearch',
  }),
};

const VECTORDB_SOLUTION = {
  iconType: 'logoVectorDB' as const,
  label: i18n.translate('xpack.spaces.solutionViewInfo.vectorDB', {
    defaultMessage: 'Vector Database',
  }),
};

const OBS_SOLUTION = {
  iconType: 'logoObservability' as const,
  label: i18n.translate('xpack.spaces.solutionViewInfo.observability', {
    defaultMessage: 'Observability',
  }),
};

const SOLUTION_VIEW_INFO: Record<SolutionKey, { iconType: IconType; label: string }> = {
  es: ES_SOLUTION,
  oblt: OBS_SOLUTION,
  search: ES_SOLUTION,
  vectordb: VECTORDB_SOLUTION,
  observability: OBS_SOLUTION,
  workplaceai: {
    iconType: 'logoElasticsearch',
    label: i18n.translate('xpack.spaces.solutionViewInfo.workplaceai', {
      defaultMessage: 'Workplace AI',
    }),
  },
  security: {
    iconType: 'logoSecurity',
    label: i18n.translate('xpack.spaces.solutionViewInfo.security', {
      defaultMessage: 'Security',
    }),
  },
  classic: {
    iconType: 'logoElasticStack',
    label: i18n.translate('xpack.spaces.solutionViewInfo.classic', {
      defaultMessage: 'Classic',
    }),
  },
};

const getSolutionViewInfo = (solution?: SolutionKey) => {
  if (!solution || !SOLUTION_VIEW_INFO[solution]) return SOLUTION_VIEW_INFO.classic;
  return SOLUTION_VIEW_INFO[solution];
};

export const useSpaceItems = ({
  spaces,
  activeSpace,
  isServerless,
  allowSolutionVisibility,
  serverlessProjectType,
}: {
  spaces?: Space[];
  activeSpace: Space | null;
  isServerless?: boolean;
  allowSolutionVisibility: boolean;
  serverlessProjectType?: SolutionKey;
}): { spaceItems: SpaceItem[]; activeSpaceItem?: SpaceItem } => {
  const showSolution = allowSolutionVisibility && !isServerless;
  const serverlessProjectSolutionInfo =
    isServerless && serverlessProjectType ? getSolutionViewInfo(serverlessProjectType) : undefined;

  const spaceItems = useMemo<SpaceItem[]>(
    () =>
      (spaces || []).map((space) => {
        const solutionInfo = showSolution ? getSolutionViewInfo(space.solution) : undefined;

        return {
          id: space.id,
          name: space.name,
          avatar: (size) => (
            <span>
              <Suspense fallback={<EuiSkeletonCircle size={size} />}>
                <LazySpaceAvatar space={space} size={size} />
              </Suspense>
            </span>
          ),
          badge: showSolution ? <SpaceSolutionBadge solution={space.solution} /> : undefined,
          solution: solutionInfo?.label,
          solutionIcon: solutionInfo?.iconType,
        };
      }),
    [spaces, showSolution]
  );

  const activeSpaceItem = useMemo<SpaceItem | undefined>(() => {
    if (!activeSpace) return undefined;

    const activeItemFromSpacesList = spaceItems.find((s) => s.id === activeSpace.id);
    const activeItemBase = activeItemFromSpacesList ?? {
      id: activeSpace.id,
      name: activeSpace.name,
    };

    // If serverless, force solution icon/label for the environment row avatar
    if (serverlessProjectSolutionInfo) {
      return {
        ...activeItemBase,
        solution: serverlessProjectSolutionInfo.label,
        solutionIcon: serverlessProjectSolutionInfo.iconType,
      };
    }
    const solutionInfo = showSolution ? getSolutionViewInfo(activeSpace.solution) : undefined;
    return {
      ...activeItemBase,
      solution: solutionInfo?.label,
      solutionIcon: solutionInfo?.iconType,
    };
  }, [activeSpace, spaceItems, showSolution, serverlessProjectSolutionInfo]);

  return { spaceItems, activeSpaceItem };
};
