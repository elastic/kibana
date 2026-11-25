/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiFontSize,
} from '@elastic/eui';

import type { BoostProfileType } from '../../../common/types';
import { NO_PROJECT_DEFAULT_MESSAGE, PROFILE_TYPE_LABELS } from '../../translations';
import { ProjectDefaultCardIcon } from './project_default_card_icon';

export interface ProjectDefaultEmptyCardProps {
  type: BoostProfileType;
}

/** Takes the place of a type's card when its default rule, or that rule's profile, is missing. */
export const ProjectDefaultEmptyCard = ({ type }: ProjectDefaultEmptyCardProps) => {
  const typeLabelFontSize = useEuiFontSize('s');

  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj={`searchBoostProjectDefaultEmpty-${type}`}>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <ProjectDefaultCardIcon type={type} />
        </EuiFlexItem>
        <EuiFlexItem>
          <h3 css={typeLabelFontSize}>{PROFILE_TYPE_LABELS[type]}</h3>
          <EuiSpacer size="xs" />
          <EuiText component="p" size="s" color="subdued">
            {NO_PROJECT_DEFAULT_MESSAGE}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
