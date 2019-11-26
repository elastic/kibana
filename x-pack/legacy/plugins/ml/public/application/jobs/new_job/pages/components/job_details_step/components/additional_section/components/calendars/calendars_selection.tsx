/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import chrome from 'ui/chrome';
import {
  EuiButton,
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiComboBoxProps,
  EuiSpacer,
} from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';
import { ml } from '../../../../../../../../../services/ml_api_service';
import { Calendar } from '../../../../../../../../../../../common/types/calendars';

export const CalendarsSelection: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [selectedCalendars, setSelectedCalendars] = useState<Calendar[]>(jobCreator.calendars);
  const [selectedOptions, setSelectedOptions] = useState<Array<EuiComboBoxOptionProps<Calendar>>>(
    []
  );
  const [options, setOptions] = useState<Array<EuiComboBoxOptionProps<Calendar>>>([]);
  const [isLoading, setIsLoading] = useState(false);

  async function loadCalendars() {
    setIsLoading(true);
    const calendars = await ml.calendars();
    setOptions(calendars.map(c => ({ label: c.calendar_id, value: c })));
    setSelectedOptions(selectedCalendars.map(c => ({ label: c.calendar_id, value: c })));
    setIsLoading(false);
  }

  useEffect(() => {
    loadCalendars();
  }, []);

  useEffect(() => {
    jobCreator.calendars = selectedCalendars;
    jobCreatorUpdate();
  }, [selectedCalendars.join()]);

  const comboBoxProps: EuiComboBoxProps<Calendar> = {
    async: true,
    options,
    selectedOptions,
    isLoading,
    onChange: optionsIn => {
      setSelectedOptions(optionsIn);
      setSelectedCalendars(optionsIn.map(o => o.value as Calendar));
    },
  };

  const manageCalendarsHref = `${chrome.getBasePath()}/app/ml#/settings/calendars_list`;

  return (
    <Description>
      <EuiButton size="s" href={manageCalendarsHref} target="_blank">
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.manageCalendarsButtonLabel"
          defaultMessage="Manage calendars"
        />
      </EuiButton>
      <EuiSpacer size="m" />
      <EuiComboBox {...comboBoxProps} />
    </Description>
  );
};
