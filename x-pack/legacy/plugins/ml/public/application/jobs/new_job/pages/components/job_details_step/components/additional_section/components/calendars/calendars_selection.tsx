/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';
import { ml } from '../../../../../../../../../services/ml_api_service';

export const CalendarsSelection: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [selectedCalendars, setSelectedCalendars] = useState(jobCreator.calendars);
  const [selectedOptions, setSelectedOptions] = useState<EuiComboBoxOptionProps[]>([]);
  const [options, setOptions] = useState<EuiComboBoxOptionProps[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadCalendars() {
    setIsLoading(true);
    const calendars = await ml.calendars();
    setOptions(calendars.map(c => ({ label: c.calendar_id })));
    setSelectedOptions(selectedCalendars.map(c => ({ label: c })));
    setIsLoading(false);
  }

  useEffect(() => {
    loadCalendars();
  }, []);

  function onChange(optionsIn: EuiComboBoxOptionProps[]) {
    setSelectedOptions(optionsIn);
    setSelectedCalendars(optionsIn.map(o => o.label));
  }

  useEffect(() => {
    jobCreator.calendars = selectedCalendars;
    jobCreatorUpdate();
  }, [selectedCalendars.join()]);

  return (
    <Description>
      <EuiComboBox
        async
        options={options}
        selectedOptions={selectedOptions}
        isLoading={isLoading}
        onChange={onChange}
      />
    </Description>
  );
};
