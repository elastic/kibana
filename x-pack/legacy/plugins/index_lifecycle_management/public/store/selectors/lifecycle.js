/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import {
  PHASE_HOT,
  PHASE_WARM,
  PHASE_COLD,
  PHASE_DELETE,
  PHASE_ENABLED,
  PHASE_ROLLOVER_ENABLED,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  STRUCTURE_POLICY_NAME,
  ERROR_STRUCTURE,
  PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_SHRINK_ENABLED,
  PHASE_FORCE_MERGE_ENABLED,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_REPLICA_COUNT,
  WARM_PHASE_ON_ROLLOVER,
  PHASE_INDEX_PRIORITY,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
} from '../../constants';

import {
  getPhase,
  getPhases,
  phaseToES,
  getSelectedPolicyName,
  isNumber,
  getSaveAsNewPolicy,
  getSelectedOriginalPolicyName,
  getPolicies,
} from '.';

import { getPolicyByName } from './policies';

export const numberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.numberRequiredError',
  {
    defaultMessage: 'A number is required.',
  }
);

export const positiveNumberRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.positiveNumberRequiredError',
  {
    defaultMessage: 'Only positive numbers are allowed.',
  }
);

export const maximumAgeRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumAgeMissingError',
  {
    defaultMessage: 'A maximum age is required.',
  }
);

export const maximumSizeRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumIndexSizeMissingError',
  {
    defaultMessage: 'A maximum index size is required.',
  }
);

export const maximumDocumentsRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.maximumDocumentsMissingError',
  {
    defaultMessage: 'Maximum documents is required.',
  }
);

export const positiveNumbersAboveZeroErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.positiveNumberAboveZeroRequiredError',
  {
    defaultMessage: 'Only numbers above 0 are allowed.',
  }
);

export const validatePhase = (type, phase, errors) => {
  const phaseErrors = {};

  if (!phase[PHASE_ENABLED]) {
    return;
  }

  for (const numberedAttribute of PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE) {
    if (phase.hasOwnProperty(numberedAttribute)) {
      // If WARM_PHASE_ON_ROLLOVER or PHASE_HOT there is no need to validate this
      if (
        numberedAttribute === PHASE_ROLLOVER_MINIMUM_AGE &&
        (phase[WARM_PHASE_ON_ROLLOVER] || type === PHASE_HOT)
      ) {
        continue;
      }
      // If shrink is disabled, there is no need to validate this
      if (numberedAttribute === PHASE_PRIMARY_SHARD_COUNT && !phase[PHASE_SHRINK_ENABLED]) {
        continue;
      }
      // If forcemerge is disabled, there is no need to validate this
      if (numberedAttribute === PHASE_FORCE_MERGE_SEGMENTS && !phase[PHASE_FORCE_MERGE_ENABLED]) {
        continue;
      }
      // PHASE_REPLICA_COUNT is optional and can be zero
      if (numberedAttribute === PHASE_REPLICA_COUNT && !phase[numberedAttribute]) {
        continue;
      }
      // PHASE_INDEX_PRIORITY is optional and can be zero
      if (numberedAttribute === PHASE_INDEX_PRIORITY && !phase[numberedAttribute]) {
        continue;
      }
      if (!isNumber(phase[numberedAttribute])) {
        phaseErrors[numberedAttribute] = [numberRequiredMessage];
      } else if (phase[numberedAttribute] < 0) {
        phaseErrors[numberedAttribute] = [positiveNumberRequiredMessage];
      } else if (
        (numberedAttribute === PHASE_ROLLOVER_MINIMUM_AGE ||
          numberedAttribute === PHASE_PRIMARY_SHARD_COUNT) &&
        phase[numberedAttribute] < 1
      ) {
        phaseErrors[numberedAttribute] = [positiveNumbersAboveZeroErrorMessage];
      }
    }
  }
  if (phase[PHASE_ROLLOVER_ENABLED]) {
    if (
      !isNumber(phase[PHASE_ROLLOVER_MAX_AGE]) &&
      !isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED]) &&
      !isNumber(phase[PHASE_ROLLOVER_MAX_DOCUMENTS])
    ) {
      phaseErrors[PHASE_ROLLOVER_MAX_AGE] = [maximumAgeRequiredMessage];
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [maximumSizeRequiredMessage];
      phaseErrors[PHASE_ROLLOVER_MAX_DOCUMENTS] = [maximumDocumentsRequiredMessage];
    }
    if (isNumber(phase[PHASE_ROLLOVER_MAX_AGE]) && phase[PHASE_ROLLOVER_MAX_AGE] < 1) {
      phaseErrors[PHASE_ROLLOVER_MAX_AGE] = [positiveNumbersAboveZeroErrorMessage];
    }
    if (
      isNumber(phase[PHASE_ROLLOVER_MAX_SIZE_STORED]) &&
      phase[PHASE_ROLLOVER_MAX_SIZE_STORED] < 1
    ) {
      phaseErrors[PHASE_ROLLOVER_MAX_SIZE_STORED] = [positiveNumbersAboveZeroErrorMessage];
    }
    if (isNumber(phase[PHASE_ROLLOVER_MAX_DOCUMENTS]) && phase[PHASE_ROLLOVER_MAX_DOCUMENTS] < 1) {
      phaseErrors[PHASE_ROLLOVER_MAX_DOCUMENTS] = [positiveNumbersAboveZeroErrorMessage];
    }
  }
  if (phase[PHASE_SHRINK_ENABLED]) {
    if (!isNumber(phase[PHASE_PRIMARY_SHARD_COUNT])) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = [numberRequiredMessage];
    } else if (phase[PHASE_PRIMARY_SHARD_COUNT] < 1) {
      phaseErrors[PHASE_PRIMARY_SHARD_COUNT] = [positiveNumbersAboveZeroErrorMessage];
    }
  }

  if (phase[PHASE_FORCE_MERGE_ENABLED]) {
    if (!isNumber(phase[PHASE_FORCE_MERGE_SEGMENTS])) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = [numberRequiredMessage];
    } else if (phase[PHASE_FORCE_MERGE_SEGMENTS] < 1) {
      phaseErrors[PHASE_FORCE_MERGE_SEGMENTS] = [positiveNumbersAboveZeroErrorMessage];
    }
  }
  errors[type] = {
    ...errors[type],
    ...phaseErrors,
  };
};

export const policyNameRequiredMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameRequiredError',
  {
    defaultMessage: 'A policy name is required.',
  }
);
export const policyNameStartsWithUnderscoreErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameStartsWithUnderscoreError',
  {
    defaultMessage: 'A policy name cannot start with an underscore.',
  }
);
export const policyNameContainsCommaErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameContainsCommaError',
  {
    defaultMessage: 'A policy name cannot include a comma.',
  }
);
export const policyNameContainsSpaceErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameContainsSpaceError',
  {
    defaultMessage: 'A policy name cannot include a space.',
  }
);
export const policyNameTooLongErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameTooLongError',
  {
    defaultMessage: 'A policy name cannot be longer than 255 bytes.',
  }
);
export const policyNameMustBeDifferentErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.differentPolicyNameRequiredError',
  {
    defaultMessage: 'The policy name must be different.',
  }
);
export const policyNameAlreadyUsedErrorMessage = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.policyNameAlreadyUsedError',
  {
    defaultMessage: 'That policy name is already used.',
  }
);
export const validateLifecycle = state => {
  // This method of deep copy does not always work but it should be fine here
  const errors = JSON.parse(JSON.stringify(ERROR_STRUCTURE));
  const policyName = getSelectedPolicyName(state);
  if (!policyName) {
    errors[STRUCTURE_POLICY_NAME].push(policyNameRequiredMessage);
  } else {
    if (policyName.startsWith('_')) {
      errors[STRUCTURE_POLICY_NAME].push(policyNameStartsWithUnderscoreErrorMessage);
    }
    if (policyName.includes(',')) {
      errors[STRUCTURE_POLICY_NAME].push(policyNameContainsCommaErrorMessage);
    }
    if (policyName.includes(' ')) {
      errors[STRUCTURE_POLICY_NAME].push(policyNameContainsSpaceErrorMessage);
    }
    if (window.TextEncoder && new window.TextEncoder('utf-8').encode(policyName).length > 255) {
      errors[STRUCTURE_POLICY_NAME].push(policyNameTooLongErrorMessage);
    }
  }

  if (
    getSaveAsNewPolicy(state) &&
    getSelectedOriginalPolicyName(state) === getSelectedPolicyName(state)
  ) {
    errors[STRUCTURE_POLICY_NAME].push(policyNameMustBeDifferentErrorMessage);
  } else if (getSelectedOriginalPolicyName(state) !== getSelectedPolicyName(state)) {
    const policyNames = getPolicies(state).map(policy => policy.name);
    if (policyNames.includes(getSelectedPolicyName(state))) {
      errors[STRUCTURE_POLICY_NAME].push(policyNameAlreadyUsedErrorMessage);
    }
  }

  const hotPhase = getPhase(state, PHASE_HOT);
  const warmPhase = getPhase(state, PHASE_WARM);
  const coldPhase = getPhase(state, PHASE_COLD);
  const deletePhase = getPhase(state, PHASE_DELETE);

  validatePhase(PHASE_HOT, hotPhase, errors);
  validatePhase(PHASE_WARM, warmPhase, errors);
  validatePhase(PHASE_COLD, coldPhase, errors);
  validatePhase(PHASE_DELETE, deletePhase, errors);
  return errors;
};

export const getLifecycle = state => {
  const policyName = getSelectedPolicyName(state);
  const phases = Object.entries(getPhases(state)).reduce((accum, [phaseName, phase]) => {
    // Hot is ALWAYS enabled
    if (phaseName === PHASE_HOT) {
      phase[PHASE_ENABLED] = true;
    }
    const esPolicy = getPolicyByName(state, policyName).policy || {};
    const esPhase = esPolicy.phases ? esPolicy.phases[phaseName] : {};
    if (phase[PHASE_ENABLED]) {
      accum[phaseName] = phaseToES(phase, esPhase);

      // These seem to be constants
      if (phaseName === PHASE_DELETE) {
        accum[phaseName].actions = {
          ...accum[phaseName].actions,
          delete: {},
        };
      }
    }
    return accum;
  }, {});

  return {
    name: getSelectedPolicyName(state),
    //type, TODO: figure this out (jsut store it and not let the user change it?)
    phases,
  };
};
