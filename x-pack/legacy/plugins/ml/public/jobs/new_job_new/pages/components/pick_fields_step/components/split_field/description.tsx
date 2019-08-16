/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';

interface Props {
  children: JSX.Element;
  jobType: JOB_TYPE;
}

export const Description: FC<Props> = memo(({ children, jobType }) => {
  if (jobType === JOB_TYPE.MULTI_METRIC) {
    const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.splitField.title', {
      defaultMessage: 'Split field',
    });
    return (
      <EuiDescribedFormGroup
        idAria="single-example-aria"
        title={<h3>{title}</h3>}
        description={
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.splitField.description"
            defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam."
          />
        }
      >
        <EuiFormRow label={title} describedByIds={['single-example-aria']}>
          {children}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else if (jobType === JOB_TYPE.POPULATION) {
    const title = i18n.translate('xpack.ml.newJob.wizard.pickFieldsStep.populationField.title', {
      defaultMessage: 'Population field',
    });
    return (
      <EuiDescribedFormGroup
        idAria="single-example-aria"
        title={<h3>{title}</h3>}
        description={
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.populationField.description"
            defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam."
          />
        }
      >
        <EuiFormRow label={title} describedByIds={['single-example-aria']}>
          {children}
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  } else {
    return null;
  }
});
