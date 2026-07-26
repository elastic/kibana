/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import { Controller, useFormContext } from 'react-hook-form';
import { PHASE_MOUNT_PATHS } from '../constants';
import type { IlmPhasesFlyoutFormInternal } from '../form';

export const PhaseFieldsMount = ({ phase }: { phase: PhaseName }) => {
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();
  return (
    <>
      {PHASE_MOUNT_PATHS[phase].map((path) => (
        <Controller key={path} name={path} control={control} render={() => <></>} />
      ))}
    </>
  );
};
