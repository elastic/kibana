/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import { getCloneFormStateFromJobConfig } from '../../hooks/use_create_analytics_form/state';
import { DataFrameAnalyticsListRow } from './common';

export function getCloneAction(createAnalyticsForm: CreateAnalyticsFormProps) {
  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });

  const { actions } = createAnalyticsForm;

  const onClick = async (item: DataFrameAnalyticsListRow) => {
    await actions.openModal();
    actions.setFormState(getCloneFormStateFromJobConfig(item!.config));
  };

  return {
    name: buttonText,
    description: buttonText,
    icon: 'copy',
    onClick,
    'data-test-subj': 'mlAnalyticsJobCloneButton',
  };
}
