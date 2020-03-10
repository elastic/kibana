/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';
import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';
import { getCloneFormStateFromJobConfig } from '../../hooks/use_create_analytics_form/state';
import { DataFrameAnalyticsListRow } from './common';

interface CloneActionProps extends CreateAnalyticsFormProps {
  item: DataFrameAnalyticsListRow;
}

export const CloneAction: FC<CloneActionProps> = ({ item, actions }) => {
  const buttonText = i18n.translate('xpack.ml.dataframe.analyticsList.cloneJobButtonLabel', {
    defaultMessage: 'Clone job',
  });

  const onClick = async () => {
    await actions.openModal();
    actions.setFormState(getCloneFormStateFromJobConfig(item!.config));
  };

  return (
    <EuiButtonEmpty
      onClick={onClick}
      data-test-subj="mlAnalyticsJobCloneButton"
      size="xs"
      color="text"
      iconType="copy"
      aria-label={buttonText}
    >
      {buttonText}
    </EuiButtonEmpty>
  );
};
