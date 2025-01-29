/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { useConfiguration } from '../../../form';

import {
  ForcemergeField,
  IndexPriorityField,
  DataTierAllocationField,
  ShrinkField,
  ReadonlyField,
  ReplicasField,
  DownsampleField,
} from '../shared_fields';

import { Phase } from '../phase';

const i18nTexts = {
  dataTierAllocation: {
    description: i18n.translate('xpack.indexLifecycleMgmt.warmPhase.dataTier.description', {
      defaultMessage: 'Move data to nodes optimized for less-frequent, read-only access.',
    }),
  },
};

export const WarmPhase: FunctionComponent = () => {
  const {
    isUsingSearchableSnapshotInHotPhase,
    isUsingDownsampleInHotPhase,
    isUsingDownsampleInWarmPhase,
  } = useConfiguration();

  return (
    <Phase phase="warm">
      <ReplicasField phase="warm" />

      {!isUsingSearchableSnapshotInHotPhase && <ShrinkField phase="warm" />}

      {!isUsingSearchableSnapshotInHotPhase && <ForcemergeField phase="warm" />}

      {!isUsingSearchableSnapshotInHotPhase && <DownsampleField phase="warm" />}

      {!isUsingSearchableSnapshotInHotPhase &&
        !isUsingDownsampleInHotPhase &&
        !isUsingDownsampleInWarmPhase && <ReadonlyField phase="warm" />}

      {/* Data tier allocation section */}
      <DataTierAllocationField
        description={i18nTexts.dataTierAllocation.description}
        phase="warm"
      />

      <IndexPriorityField phase="warm" />
    </Phase>
  );
};
