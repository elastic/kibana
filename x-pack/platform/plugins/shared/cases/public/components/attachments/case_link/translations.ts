/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LINKED_CASES = i18n.translate('xpack.cases.attachments.caseLink.label', {
  defaultMessage: 'Linked cases',
});

export const UNLINKED_CASE = i18n.translate('xpack.cases.userActions.unlinkedCase', {
  defaultMessage: 'unlinked a case',
});

export const CASE_NUMBER = (number: number) =>
  i18n.translate('xpack.cases.attachments.caseLink.caseNumber', {
    defaultMessage: '#{number}',
    values: { number },
  });

export const INACCESSIBLE_CASE = i18n.translate('xpack.cases.attachments.caseLink.inaccessible', {
  defaultMessage: "a case you don't have access to",
});
