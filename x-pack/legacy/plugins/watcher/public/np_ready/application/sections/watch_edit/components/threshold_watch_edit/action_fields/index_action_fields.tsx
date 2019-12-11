/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../../../components/form_errors';
import { IndexAction } from '../../../../../../../../common/types/action_types';

interface Props {
  action: IndexAction;
  editAction: (changedProperty: { key: string; value: string }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const IndexActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { index } = action;
  return (
    <ErrableFormRow
      id="indexName"
      errorKey="index"
      fullWidth
      errors={errors}
      isShowingErrors={hasErrors && index !== undefined}
      label={i18n.translate(
        'xpack.watcher.sections.watchEdit.threshold.indexAction.indexFieldLabel',
        {
          defaultMessage: 'Index',
        }
      )}
    >
      <EuiFieldText
        fullWidth
        name="index"
        data-test-subj="indexInput"
        value={index || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          editAction({ key: 'index', value: e.target.value });
        }}
        onBlur={() => {
          if (!index) {
            editAction({ key: 'index', value: '' });
          }
        }}
      />
    </ErrableFormRow>
  );
};
