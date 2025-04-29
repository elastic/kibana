/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../../common/translations';
export * from '../user_profiles/translations';
export {
  OPEN as STATUS_OPEN,
  IN_PROGRESS as STATUS_IN_PROGRESS,
  CLOSED as STATUS_CLOSED,
} from '@kbn/cases-components/src/status/translations';

export const NO_CASES = i18n.translate('xpack.cases.similarCaseTable.noCases.title', {
  defaultMessage: 'No cases to display',
});

export const NO_CASES_BODY = i18n.translate('xpack.cases.similarCaseTable.noCases.readonly.body', {
  defaultMessage: 'Edit your filter settings.',
});

export const SIMILARITY_REASON = i18n.translate('xpack.cases.similarCaseTable.similarities.title', {
  defaultMessage: 'Similar observable values',
});
