/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TimeFieldSelect } from './time_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { useNewJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import type { AdvancedJobCreator } from '../../../../../common/job_creator';
import type { Validation } from '../../../../../common/job_validator';
import { Description } from './description';

export const TimeField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as AdvancedJobCreator;
  const { dateFields } = useNewJobCapsService();
  const [timeFieldName, setTimeFieldName] = useState(jobCreator.timeFieldName);
  const [searchValue, setSearchValue] = useState('');
  const [hasFocus, setHasFocus] = useState(false);
  const titleId = useGeneratedHtmlId({
    prefix: 'timeField',
  });

  // Text left in the combo box after it loses focus does not match any time field.
  const validation: Validation =
    searchValue !== '' && hasFocus === false
      ? {
          valid: false,
          message: i18n.translate('xpack.ml.newJob.wizard.datafeedStep.timeField.invalidError', {
            defaultMessage: 'Select a time field from the list.',
          }),
        }
      : { valid: true };

  useEffect(() => {
    jobCreator.timeFieldName = timeFieldName;
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFieldName]);

  useEffect(() => {
    setTimeFieldName(jobCreator.timeFieldName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <Description validation={validation} titleId={titleId}>
      <TimeFieldSelect
        fields={dateFields}
        changeHandler={setTimeFieldName}
        selectedField={timeFieldName}
        timeFieldTitleId={titleId}
        isInvalid={validation.valid === false}
        onSearchChange={setSearchValue}
        onFocusChange={setHasFocus}
      />
    </Description>
  );
};
