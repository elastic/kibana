/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PhaseWithTiming } from '../../../../../../../../common/types';

export function getUnitsAriaLabelForPhase(phase: PhaseWithTiming) {
  switch (phase) {
    case 'warm':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of warm phase',
        }
      );

    case 'cold':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of cold phase',
        }
      );

    case 'frozen':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseFrozen.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of frozen phase',
        }
      );

    case 'delete':
      return i18n.translate(
        'xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeUnitsAriaLabel',
        {
          defaultMessage: 'Units for timing of delete phase',
        }
      );
  }
}
export function getTimingLabelForPhase(phase: PhaseWithTiming) {
  switch (phase) {
    case 'warm':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseWarm.minimumAgeLabel', {
        defaultMessage: 'Timing for warm phase',
      });

    case 'cold':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseCold.minimumAgeLabel', {
        defaultMessage: 'Timing for cold phase',
      });

    case 'frozen':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseFrozen.minimumAgeLabel', {
        defaultMessage: 'Timing for frozen phase',
      });

    case 'delete':
      return i18n.translate('xpack.indexLifecycleMgmt.editPolicy.phaseDelete.minimumAgeLabel', {
        defaultMessage: 'Timing for delete phase',
      });
  }
}
