/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EcsField } from '../../../common/types/schema';
import { useEcsSchema } from './use_ecs_schema';

export interface ECSSchemaOption {
  label: string;
  value: EcsField;
}

export const useEcsSchemaOptions = (): ECSSchemaOption[] => {
  const { data: ecsSchemaData } = useEcsSchema();

  return useMemo(
    () =>
      (ecsSchemaData ?? []).map((ecs) => ({
        label: ecs.field,
        value: ecs,
      })),
    [ecsSchemaData]
  );
};
