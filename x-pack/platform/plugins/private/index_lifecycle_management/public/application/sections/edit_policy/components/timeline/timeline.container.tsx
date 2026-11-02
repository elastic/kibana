/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';

import { useFormData } from '../../../../../shared_imports';

import { formDataToAbsoluteTimings, getPhaseEnabled } from '../../lib';

import { useConfiguration } from '../../form';

import type { FormInternal } from '../../types';
import { useEditPolicyContext } from '../../edit_policy_context';

import { Timeline as ViewComponent } from './timeline';

export const Timeline: FunctionComponent = () => {
  const [formData] = useFormData<FormInternal>();
  const { isHotPhaseRequired } = useEditPolicyContext();
  const timings = formDataToAbsoluteTimings(formData);
  const { isUsingRollover } = useConfiguration();
  const showHotPhase = getPhaseEnabled({ phase: 'hot', formData, isHotPhaseRequired });
  return (
    <ViewComponent
      hotPhaseMinAge={timings.hot.min_age}
      warmPhaseMinAge={timings.warm?.min_age}
      coldPhaseMinAge={timings.cold?.min_age}
      frozenPhaseMinAge={timings.frozen?.min_age}
      deletePhaseMinAge={timings.delete?.min_age}
      isUsingRollover={isUsingRollover}
      hasDeletePhase={Boolean(formData._meta?.delete?.enabled)}
      showHotPhase={showHotPhase}
    />
  );
};
