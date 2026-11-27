/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';

import type { BoostProfileType } from '../../../common/types';
import { PROJECT_DEFAULTS_TITLE } from '../../translations';
import type { ProjectDefaultCardProps } from './project_default_card';
import { ProjectDefaultCard } from './project_default_card';

type ProjectDefaultCardData = Omit<
  ProjectDefaultCardProps,
  'type' | 'canEdit' | 'onEdit' | 'onViewProfile'
>;

export interface ProjectDefaultsProps {
  canEdit: boolean;
  indices: ProjectDefaultCardData;
  dataStreams: ProjectDefaultCardData;
  onEdit: (type: BoostProfileType) => void;
  onViewProfile?: (profileName: string) => void;
}

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

export const ProjectDefaults = ({
  canEdit,
  indices,
  dataStreams,
  onEdit,
  onViewProfile,
}: ProjectDefaultsProps) => {
  const byType: Record<BoostProfileType, ProjectDefaultCardData> = {
    indices,
    data_streams: dataStreams,
  };

  return (
    <section data-test-subj="searchBoostProjectDefaults">
      <EuiTitle size="xs">
        <h2>{PROJECT_DEFAULTS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l">
        {PROFILE_TYPES.map((type) => (
          <EuiFlexItem key={type}>
            <ProjectDefaultCard
              type={type}
              {...byType[type]}
              canEdit={canEdit}
              onEdit={() => onEdit(type)}
              onViewProfile={onViewProfile}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </section>
  );
};
