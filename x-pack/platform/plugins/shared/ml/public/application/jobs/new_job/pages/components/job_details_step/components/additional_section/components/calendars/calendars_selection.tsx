/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  filterCalendarsForDst,
  separateCalendarsByType,
} from '../../../../../../../../../settings/calendars/dst_utils';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';
import type { MlCalendar } from '../../../../../../../../../../../common/types/calendars';
import { useMlApi } from '../../../../../../../../../contexts/kibana';
import { GLOBAL_CALENDAR } from '../../../../../../../../../../../common/constants/calendars';
import { ML_PAGES } from '../../../../../../../../../../../common/constants/locator';
import { DescriptionDst } from './description_dst';
import { useMlManagementLink } from '../../../../../../../../../contexts/kibana/use_create_url';
import { MANAGEMENT_SECTION_IDS } from '../../../../../../../../../management';

interface Props {
  isDst?: boolean;
}

export const CalendarsSelection: FC<Props> = ({ isDst = false }) => {
  const mlApi = useMlApi();

  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [selectedCalendars, setSelectedCalendars] = useState<MlCalendar[]>(
    filterCalendarsForDst(jobCreator.calendars, isDst)
  );
  const [selectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<MlCalendar>>
  >([]);
  const [options, setOptions] = useState<Array<EuiComboBoxOptionOption<MlCalendar>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const titleId = useGeneratedHtmlId({ prefix: 'calendarsSelection' });

  async function loadCalendars() {
    setIsLoading(true);
    const { calendars, calendarsDst } = separateCalendarsByType(await mlApi.calendars());
    const filteredCalendars = (isDst ? calendarsDst : calendars).filter(
      (c) => c.job_ids.includes(GLOBAL_CALENDAR) === false
    );
    setOptions(filteredCalendars.map((c) => ({ label: c.calendar_id, value: c })));
    setSelectedOptions(selectedCalendars.map((c) => ({ label: c.calendar_id, value: c })));
    setIsLoading(false);
  }

  useEffect(() => {
    loadCalendars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { calendars, calendarsDst } = separateCalendarsByType(jobCreator.calendars);
    const otherCalendars = isDst ? calendars : calendarsDst;
    jobCreator.calendars = [...selectedCalendars, ...otherCalendars];
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCalendars.join()]);

  const comboBoxProps: EuiComboBoxProps<MlCalendar> = {
    async: true,
    options,
    selectedOptions,
    isLoading,
    onChange: (optionsIn) => {
      setSelectedOptions(optionsIn);
      setSelectedCalendars(optionsIn.map((o) => o.value!));
    },
  };

  const manageCalendarsHref = useMlManagementLink(
    isDst ? ML_PAGES.CALENDARS_DST_MANAGE : ML_PAGES.CALENDARS_MANAGE,
    MANAGEMENT_SECTION_IDS.AD_SETTINGS
  );

  const Desc = isDst ? DescriptionDst : Description;

  return (
    <Desc titleId={isDst ? `Dst${titleId}` : titleId}>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem>
          <EuiComboBox
            {...comboBoxProps}
            data-test-subj="mlJobWizardComboBoxCalendars"
            aria-labelledby={isDst ? `Dst${titleId}` : titleId}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            position="right"
            content={
              <FormattedMessage
                id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.refreshCalendarsButtonLabel"
                defaultMessage="Refresh calendars"
              />
            }
          >
            <EuiButtonIcon
              iconType="refresh"
              color="primary"
              aria-label={i18n.translate(
                'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.refreshCalendarsButtonLabel',
                {
                  defaultMessage: 'Refresh calendars',
                }
              )}
              onClick={loadCalendars}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <EuiLink href={manageCalendarsHref} target="_blank" external>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.calendarsSelection.manageCalendarsButtonLabel"
            defaultMessage="Manage calendars"
          />
        </EuiLink>
      </EuiText>
    </Desc>
  );
};
