/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../../../components/form_errors';
import { PagerDutyAction } from '../../../../../../../../common/types/action_types';

interface Props {
  action: PagerDutyAction;
  editAction: (changedProperty: { key: string; value: string }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
  children: React.ReactNode;
}

export const PagerDutyActionFields: React.FunctionComponent<Props> = ({
  errors,
  hasErrors,
  action,
  editAction,
  children,
}) => {
  const { description } = action;
  return (
    <Fragment>
      {children}
      <ErrableFormRow
        id="pagerDutyDescription"
        errorKey="description"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && description !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.pagerDutyAction.descriptionFieldLabel',
          {
            defaultMessage: 'Description',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="description"
          value={description || ''}
          data-test-subj="pagerdutyDescriptionInput"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            editAction({ key: 'description', value: e.target.value });
          }}
          onBlur={() => {
            if (!description) {
              editAction({ key: 'description', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
