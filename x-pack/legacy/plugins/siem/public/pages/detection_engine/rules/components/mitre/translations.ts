/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TACTIC = i18n.translate('xpack.siem.detectionEngine.mitreAttack.tacticsDescription', {
  defaultMessage: 'Tactic',
});

export const TECHNIQUES = i18n.translate(
  'xpack.siem.detectionEngine.mitreAttack.techniquesDescription',
  {
    defaultMessage: 'Techniques',
  }
);

export const ADD_MITRE_ATTACK = i18n.translate('xpack.siem.detectionEngine.mitreAttack.addTitle', {
  defaultMessage: 'Add MITRE ATT&CK threat',
});

export const TECHNIQUES_PLACEHOLDER = i18n.translate(
  'xpack.siem.detectionEngine.mitreAttack.techniquesPlaceHolderDescription',
  {
    defaultMessage: 'Select techniques ...',
  }
);

export const TACTIC_PLACEHOLDER = i18n.translate(
  'xpack.siem.detectionEngine.mitreAttack.tacticPlaceHolderDescription',
  {
    defaultMessage: 'Select tactic ...',
  }
);
