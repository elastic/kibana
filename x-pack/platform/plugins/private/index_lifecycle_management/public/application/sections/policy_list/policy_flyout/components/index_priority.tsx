/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  SerializedHotPhase,
  SerializedWarmPhase,
  SerializedColdPhase,
} from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const IndexPriority = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const indexPriority = (
    phaseConfig as SerializedHotPhase | SerializedWarmPhase | SerializedColdPhase
  )?.actions.set_priority;
  return indexPriority ? (
    <ActionDescription
      title={i18nTexts.editPolicy.indexPriorityFieldLabel}
      descriptionItems={[indexPriority.priority]}
    />
  ) : null;
};
