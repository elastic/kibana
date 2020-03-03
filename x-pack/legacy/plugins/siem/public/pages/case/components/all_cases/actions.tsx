/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DefaultItemIconButtonAction } from '@elastic/eui/src/components/basic_table/action_types';
import { Case } from '../../../../containers/case/types';
import * as i18n from './translations';

export const getActions = (
  currentState: string,
  updateTheState: (theCase: Case, updateValue: 'open' | 'closed') => void
): Array<DefaultItemIconButtonAction<Case>> => [
  {
    description: i18n.DELETE,
    icon: 'trash',
    name: i18n.DELETE,
    // eslint-disable-next-line no-console
    onClick: ({ caseId }: Case) => console.log('TO DO Delete case', caseId),
    type: 'icon',
    'data-test-subj': 'action-delete',
  },
  currentState === 'open'
    ? {
        description: i18n.CLOSE_CASE,
        icon: 'magnet',
        name: i18n.CLOSE_CASE,
        onClick: (theCase: Case) => updateTheState(theCase, 'closed'),
        type: 'icon',
        'data-test-subj': 'action-close',
      }
    : {
        description: i18n.REOPEN_CASE,
        icon: 'magnet',
        name: i18n.REOPEN_CASE,
        onClick: (theCase: Case) => updateTheState(theCase, 'open'),
        type: 'icon',
        'data-test-subj': 'action-open',
      },
  {
    description: i18n.DUPLICATE_CASE,
    icon: 'copy',
    name: i18n.DUPLICATE_CASE,
    // eslint-disable-next-line no-console
    onClick: ({ caseId }: Case) => console.log('TO DO Duplicate case', caseId),
    type: 'icon',
    'data-test-subj': 'action-to-do',
  },
];
