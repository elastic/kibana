/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const editDeletePhaseFlyoutI18n = {
  title: i18n.translate('xpack.streams.editDeletePhaseFlyout.title', {
    defaultMessage: 'Edit delete phase',
  }),
  description: i18n.translate('xpack.streams.editDeletePhaseFlyout.description', {
    defaultMessage: 'Use to delete your data once it has reached a specified age.',
  }),
  restoreDefaultButtonLabel: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.restoreDefaultButtonLabel',
    {
      defaultMessage: 'Restore default',
    }
  ),
  applyButtonLabel: i18n.translate('xpack.streams.editDeletePhaseFlyout.applyButtonLabel', {
    defaultMessage: 'Apply',
  }),
  applyDisabledTooltip: i18n.translate('xpack.streams.editDeletePhaseFlyout.applyDisabledTooltip', {
    defaultMessage: 'Fix the form errors before applying.',
  }),
  applySubmittingDisabledTooltip: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.applySubmittingDisabledTooltip',
    {
      defaultMessage: 'Applying changes…',
    }
  ),
  applyUnchangedDisabledTooltip: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.applyUnchangedDisabledTooltip',
    {
      defaultMessage: 'Make changes before applying.',
    }
  ),
  removeDeletePhaseButtonLabel: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.removeDeletePhaseButtonLabel',
    {
      defaultMessage: 'Remove delete phase',
    }
  ),
  cancelButtonLabel: i18n.translate('xpack.streams.editDeletePhaseFlyout.cancelButtonLabel', {
    defaultMessage: 'Cancel',
  }),
  deleteAfterLabel: i18n.translate('xpack.streams.editDeletePhaseFlyout.deleteAfterLabel', {
    defaultMessage: 'Delete after',
  }),
  deleteAfterValueAriaLabel: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.deleteAfterValueAriaLabel',
    {
      defaultMessage: 'Delete after value',
    }
  ),
  deleteAfterUnitAriaLabel: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.deleteAfterUnitAriaLabel',
    {
      defaultMessage: 'Delete after unit',
    }
  ),
  minAgeRequiredErrorMessage: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.minAgeRequiredErrorMessage',
    {
      defaultMessage: 'A value is required.',
    }
  ),
  nonNegativeIntegerRequiredErrorMessage: i18n.translate(
    'xpack.streams.editDeletePhaseFlyout.nonNegativeIntegerRequiredErrorMessage',
    {
      defaultMessage: 'A non-negative integer is required.',
    }
  ),
};
