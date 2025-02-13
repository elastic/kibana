/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  SerializedColdPhase,
  SerializedHotPhase,
  SerializedWarmPhase,
} from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const Readonly = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const readonly = (phaseConfig as SerializedHotPhase | SerializedWarmPhase | SerializedColdPhase)
    ?.actions.readonly;
  return readonly ? <ActionDescription title={i18nTexts.editPolicy.readonlyLabel} /> : null;
};
