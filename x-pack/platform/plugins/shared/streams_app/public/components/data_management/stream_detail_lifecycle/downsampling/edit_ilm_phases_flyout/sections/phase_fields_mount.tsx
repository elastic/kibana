/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { PHASE_MOUNT_PATHS } from '../constants';

export const PhaseFieldsMount = ({ phase }: { phase: PhaseName }) => {
  return (
    <>
      {PHASE_MOUNT_PATHS[phase].map((path) => (
        <UseField key={path} path={path}>
          {() => null}
        </UseField>
      ))}
    </>
  );
};
