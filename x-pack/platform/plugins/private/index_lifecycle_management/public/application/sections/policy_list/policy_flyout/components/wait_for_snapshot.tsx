/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';
import { SerializedDeletePhase } from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';
import { ActionDescription } from './action_description';
import type { ActionComponentProps } from './types';

export const WaitForSnapshot = ({ phase, phases }: ActionComponentProps) => {
  const phaseConfig = phases[phase];
  const waitForSnapshot = (phaseConfig as SerializedDeletePhase).actions?.wait_for_snapshot;
  return waitForSnapshot ? (
    <ActionDescription
      title={i18nTexts.editPolicy.waitForSnapshotLabel}
      descriptionItems={[<EuiCode>{waitForSnapshot.policy}</EuiCode>]}
    />
  ) : null;
};
