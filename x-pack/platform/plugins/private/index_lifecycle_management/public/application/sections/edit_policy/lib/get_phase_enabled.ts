/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

import type { Phase } from '../../../../../common/types';
import type { FormInternal } from '../types';

export const getPhaseEnabled = ({
  phase,
  formData,
  isHotPhaseRequired,
}: {
  phase: Phase;
  formData: FormInternal;
  isHotPhaseRequired: boolean;
}): boolean => {
  // Hot phase is always enabled unless it's editing a policy that doesn't have a hot phase.
  if (phase === 'hot' && isHotPhaseRequired) {
    return true;
  }

  return Boolean(get(formData, `_meta.${phase}.enabled`));
};
