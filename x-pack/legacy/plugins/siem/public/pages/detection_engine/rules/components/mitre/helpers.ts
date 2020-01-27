/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';

import { IMitreAttack } from '../../types';

export const isMitreAttackInvalid = (
  tacticName: string | null | undefined,
  techniques: IMitreAttack[] | null | undefined
) => {
  if (isEmpty(tacticName) || (tacticName !== 'none' && isEmpty(techniques))) {
    return true;
  }
  return false;
};
