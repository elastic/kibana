/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { IlmPhasesFlyoutFormInternal } from '../form';

export const GlobalFieldsMount = () => {
  const { control } = useFormContext<IlmPhasesFlyoutFormInternal>();
  return (
    <Controller name="_meta.searchableSnapshot.repository" control={control} render={() => <></>} />
  );
};
