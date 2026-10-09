/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESCALATION_MODAL_TRANSLATIONS = Object.freeze({
  title: i18n.translate('xpack.agenticInvestigations.escalationModal.title', {
    defaultMessage: 'Escalate investigation',
  }),
  subtitle: (investigationTitle: string) =>
    i18n.translate('xpack.agenticInvestigations.escalationModal.subtitle', {
      defaultMessage:
        'Escalate "{investigationTitle}" into a new escalation, or link it to one that exists.',
      values: { investigationTitle },
    }),
  modes: {
    create: {
      label: i18n.translate('xpack.agenticInvestigations.escalationModal.modes.create.label', {
        defaultMessage: 'Create escalation',
      }),
      description: i18n.translate(
        'xpack.agenticInvestigations.escalationModal.modes.create.description',
        {
          defaultMessage: 'New escalation, with link',
        }
      ),
    },
    addToExisting: {
      label: i18n.translate(
        'xpack.agenticInvestigations.escalationModal.modes.addToExisting.label',
        {
          defaultMessage: 'Add to existing',
        }
      ),
      description: i18n.translate(
        'xpack.agenticInvestigations.escalationModal.modes.addToExisting.description',
        { defaultMessage: 'Link into an open escalation' }
      ),
    },
  },
  createForm: {
    titleLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.titleLabel',
      {
        defaultMessage: 'Escalation title',
      }
    ),
    titleHelpText: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.titleHelpText',
      {
        defaultMessage:
          'Inherited from the investigation — edit anytime. Metadata fills in automatically.',
      }
    ),
    visibilityLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.visibilityLabel',
      {
        defaultMessage: 'Visibility',
      }
    ),
    publicLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.publicLabel',
      {
        defaultMessage: 'Public',
      }
    ),
    privateLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.privateLabel',
      {
        defaultMessage: 'Private',
      }
    ),
    whoHasAccessLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.whoHasAccessLabel',
      { defaultMessage: 'Who has access' }
    ),
    searchUsersPlaceholder: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.searchUsersPlaceholder',
      { defaultMessage: 'Search users' }
    ),
    ownerLabel: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.ownerLabel',
      {
        defaultMessage: 'Owner',
      }
    ),
    submitButton: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.createForm.submitButton',
      {
        defaultMessage: 'Open escalation',
      }
    ),
  },
  addToExistingForm: {
    searchPlaceholder: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.searchPlaceholder',
      { defaultMessage: 'Search escalations...' }
    ),
    accessNote: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.accessNote',
      {
        defaultMessage: 'Only escalations you own or participate in are shown.',
      }
    ),
    linkedInvestigationsCount: (count: number) =>
      i18n.translate('xpack.agenticInvestigations.escalationModal.addToExistingForm.linkedCount', {
        defaultMessage:
          '{count, plural, one {# linked investigation} other {# linked investigations}}',
        values: { count },
      }),
    openBadge: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.openBadge',
      {
        defaultMessage: 'Open',
      }
    ),
    submitButton: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.submitButton',
      {
        defaultMessage: 'Add to escalation',
      }
    ),
    loadingText: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.loadingText',
      {
        defaultMessage: 'Loading escalations...',
      }
    ),
    emptyText: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.emptyText',
      {
        defaultMessage: 'No escalations found.',
      }
    ),
    alreadyLinkedTooltip: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.alreadyLinkedTooltip',
      { defaultMessage: 'This investigation is already part of this escalation.' }
    ),
    notOwnerTooltip: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.notOwnerTooltip',
      { defaultMessage: 'You can only add to escalations you own.' }
    ),
    loadErrorTitle: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.loadErrorTitle',
      { defaultMessage: 'Failed to load escalations.' }
    ),
    retryButton: i18n.translate(
      'xpack.agenticInvestigations.escalationModal.addToExistingForm.retryButton',
      {
        defaultMessage: 'Retry',
      }
    ),
  },
  cancelButton: i18n.translate('xpack.agenticInvestigations.escalationModal.cancelButton', {
    defaultMessage: 'Cancel',
  }),
  alreadyEscalatedCallout: {
    title: (count: number) =>
      i18n.translate('xpack.agenticInvestigations.escalationModal.alreadyEscalatedCallout.title', {
        defaultMessage:
          '{count, plural, one {This investigation is already part of an open escalation} other {This investigation is already part of # open escalations}}',
        values: { count },
      }),
  },
});

export const ESCALATION_SUCCESS = Object.freeze({
  createTitle: i18n.translate('xpack.agenticInvestigations.escalation.createSuccess.title', {
    defaultMessage: 'Escalation created',
  }),
  addToTitle: i18n.translate('xpack.agenticInvestigations.escalation.addToSuccess.title', {
    defaultMessage: 'Investigation added to escalation',
  }),
  linkText: i18n.translate('xpack.agenticInvestigations.escalation.success.openEscalation', {
    defaultMessage: 'Open escalation',
  }),
});

export const ESCALATION_ERRORS = Object.freeze({
  createFailed: i18n.translate('xpack.agenticInvestigations.escalation.createFailed', {
    defaultMessage: 'Failed to create the escalation. Try again.',
  }),
  addToFailed: i18n.translate('xpack.agenticInvestigations.escalation.addToFailed', {
    defaultMessage: 'Failed to add to the escalation. Try again.',
  }),
  userProfileLoadFailed: i18n.translate(
    'xpack.agenticInvestigations.escalation.userProfileLoadFailed',
    {
      defaultMessage: 'Failed to load your profile. Try again.',
    }
  ),
  userProfileUnavailable: i18n.translate(
    'xpack.agenticInvestigations.escalation.userProfileUnavailable',
    {
      defaultMessage: 'Your user profile is unavailable. Escalations cannot be created.',
    }
  ),
  retryButton: i18n.translate('xpack.agenticInvestigations.escalation.retryButton', {
    defaultMessage: 'Retry',
  }),
});
