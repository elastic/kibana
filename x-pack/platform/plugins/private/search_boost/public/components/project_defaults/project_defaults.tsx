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
import { ProjectDefaultEmptyCard } from './project_default_empty_card';

export type ProjectDefaultCardData = Omit<
  ProjectDefaultCardProps,
  'type' | 'canEdit' | 'onEdit' | 'getProfileLinkProps'
>;

export interface ProjectDefaultsProps
  extends Pick<ProjectDefaultCardProps, 'canEdit' | 'getProfileLinkProps'> {
  indices?: ProjectDefaultCardData;
  dataStreams?: ProjectDefaultCardData;
  onEdit?: (type: BoostProfileType) => void;
}

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

export const ProjectDefaults = ({
  canEdit,
  indices,
  dataStreams,
  onEdit,
  getProfileLinkProps,
}: ProjectDefaultsProps) => {
  const byType: Record<BoostProfileType, ProjectDefaultCardData | undefined> = {
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
        {PROFILE_TYPES.map((type) => {
          const data = byType[type];
          return (
            <EuiFlexItem key={type}>
              {data ? (
                <ProjectDefaultCard
                  type={type}
                  {...data}
                  canEdit={canEdit}
                  onEdit={onEdit && (() => onEdit(type))}
                  getProfileLinkProps={getProfileLinkProps}
                />
              ) : (
                <ProjectDefaultEmptyCard type={type} />
              )}
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </section>
  );
};
