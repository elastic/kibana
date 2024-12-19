/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PhaseWithAllocation } from '../../../../../../common/types';
import { i18nTexts } from '../../../edit_policy/i18n_texts';

import type { ActionComponentProps } from './types';
import { ActionDescription } from './action_description';

export const Replicas = ({ phase, phases }: ActionComponentProps) => {
  const allocate = phases[phase as PhaseWithAllocation]?.actions.allocate;
  return allocate?.number_of_replicas !== undefined ? (
    <ActionDescription
      title={i18nTexts.editPolicy.replicasLabel}
      descriptionItems={[
        <>
          {`${i18nTexts.editPolicy.numberOfReplicasLabel}: `}
          <strong>{allocate.number_of_replicas}</strong>
        </>,
      ]}
    />
  ) : null;
};
