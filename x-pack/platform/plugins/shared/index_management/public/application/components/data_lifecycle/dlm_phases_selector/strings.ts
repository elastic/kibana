/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PHASE_DESCRIPTIONS, PHASE_TITLES } from '@kbn/data-lifecycle-phases';

export const dlmPhasesSelectorStrings = {
  hotPhaseLabel: PHASE_TITLES.hot,
  hotPhaseDescription: PHASE_DESCRIPTIONS.hot,
  requiredBadgeLabel: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.requiredBadgeLabel',
    {
      defaultMessage: 'Required',
    }
  ),
  frozenPhaseLabel: PHASE_TITLES.frozen,
  frozenPhaseDescription: PHASE_DESCRIPTIONS.frozen,
  moveAfterLabel: i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.moveAfterLabel', {
    defaultMessage: 'Move after',
  }),
  searchableSnapshotLabel: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.searchableSnapshotLabel',
    {
      defaultMessage: 'Searchable snapshot',
    }
  ),
  searchableSnapshotTooltip: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.searchableSnapshotTooltip',
    {
      defaultMessage: 'Frozen data is searched from a snapshot repository.',
    }
  ),
  deletePhaseLabel: PHASE_TITLES.delete,
  deletePhaseDescription: PHASE_DESCRIPTIONS.delete,
  deleteAfterLabel: i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.deleteAfterLabel', {
    defaultMessage: 'Delete after',
  }),
  durationInputAriaLabel: (phase: string) =>
    i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.durationInputAriaLabel', {
      defaultMessage: '{phase} duration value',
      values: { phase },
    }),
  durationUnitAriaLabel: (phase: string) =>
    i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.durationUnitAriaLabel', {
      defaultMessage: '{phase} duration unit',
      values: { phase },
    }),
  frozenPhaseCheckboxAriaLabel: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.frozenPhaseCheckboxAriaLabel',
    {
      defaultMessage: 'Enable frozen phase',
    }
  ),
  hotPhaseCheckboxAriaLabel: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.hotPhaseCheckboxAriaLabel',
    {
      defaultMessage: 'Hot phase is required',
    }
  ),
  deletePhaseCheckboxAriaLabel: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.deletePhaseCheckboxAriaLabel',
    {
      defaultMessage: 'Enable delete phase',
    }
  ),
  positiveIntegerRequiredError: i18n.translate(
    'xpack.idxMgmt.dataLifecyclePhaseSelector.positiveIntegerRequiredError',
    {
      defaultMessage: 'Enter a whole number greater than 0.',
    }
  ),
  frozenMustOccurBeforeDeleteError: (deletePhaseDuration: string) =>
    i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.frozenMustOccurBeforeDeleteError', {
      defaultMessage: 'Must occur before the delete phase ({deletePhaseDuration}).',
      values: { deletePhaseDuration },
    }),
  deleteMustOccurAfterFrozenError: (frozenPhaseDuration: string) =>
    i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.deleteMustOccurAfterFrozenError', {
      defaultMessage: 'Must occur after the frozen phase ({frozenPhaseDuration}).',
      values: { frozenPhaseDuration },
    }),
  deleteMaximumRetentionText: (maximumRetentionPeriod: string) =>
    i18n.translate('xpack.idxMgmt.dataLifecyclePhaseSelector.deleteMaximumRetentionText', {
      defaultMessage: 'Must occur before the maximum retention ({maximumRetentionPeriod}).',
      values: { maximumRetentionPeriod },
    }),
};
