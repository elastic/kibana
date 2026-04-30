/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usePhaseColors, PHASE_DESCRIPTIONS } from '@kbn/data-lifecycle-phases';

export const useIlmPhasesColorAndDescription = () => {
  const phaseColors = usePhaseColors();

  return {
    ilmPhases: {
      hot: {
        color: phaseColors.hot,
        description: PHASE_DESCRIPTIONS.hot,
      },
      warm: {
        color: phaseColors.warm,
        description: PHASE_DESCRIPTIONS.warm,
      },
      cold: {
        color: phaseColors.cold,
        description: PHASE_DESCRIPTIONS.cold,
      },
      frozen: {
        color: phaseColors.frozen,
        description: PHASE_DESCRIPTIONS.frozen,
      },
      delete: {
        color: phaseColors.delete,
        description: PHASE_DESCRIPTIONS.delete,
      },
    },
  };
};
