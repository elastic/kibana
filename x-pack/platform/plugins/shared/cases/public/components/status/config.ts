/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getStatusConfiguration } from '@kbn/cases-components/src/status/config';
import { CaseStatuses } from '../../../common/types/domain';
import * as i18n from './translations';
import type { Statuses } from './types';

const statusConfiguration = getStatusConfiguration();

export const statuses: Statuses = {
  [CaseStatuses.open]: {
    ...statusConfiguration[CaseStatuses.open],
    actions: {
      single: {
        title: i18n.OPEN_CASE,
      },
    },
    actionBar: {
      title: i18n.CASE_OPENED,
    },
    button: {
      label: i18n.REOPEN_CASE,
    },
    stats: {
      title: i18n.OPEN_CASES,
    },
  },
  [CaseStatuses['in-progress']]: {
    ...statusConfiguration[CaseStatuses['in-progress']],
    actions: {
      single: {
        title: i18n.MARK_CASE_IN_PROGRESS,
      },
    },
    actionBar: {
      title: i18n.CASE_IN_PROGRESS,
    },
    button: {
      label: i18n.MARK_CASE_IN_PROGRESS,
    },
    stats: {
      title: i18n.IN_PROGRESS_CASES,
    },
  },
  [CaseStatuses.closed]: {
    ...statusConfiguration[CaseStatuses.closed],
    actions: {
      single: {
        title: i18n.CLOSE_CASE,
      },
    },
    actionBar: {
      title: i18n.CASE_CLOSED,
    },
    button: {
      label: i18n.CLOSE_CASE,
    },
    stats: {
      title: i18n.CLOSED_CASES,
    },
  },
};
