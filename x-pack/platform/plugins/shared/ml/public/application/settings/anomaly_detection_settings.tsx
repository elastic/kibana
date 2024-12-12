/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { Fragment, useContext, useEffect, useState } from 'react';

import {
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { useMlApi } from '../contexts/kibana';
import { AnomalyDetectionSettingsContext } from './anomaly_detection_settings_context';
import { useToastNotificationService } from '../services/toast_notification_service';
import { ML_PAGES } from '../../../common/constants/locator';
import { useCreateAndNavigateToMlLink } from '../contexts/kibana/use_create_url';
import { separateCalendarsByType } from './calendars/dst_utils';

export const AnomalyDetectionSettings: FC = () => {
  const mlApi = useMlApi();

  const [calendarsCount, setCalendarsCount] = useState(0);
  const [calendarsDstCount, setCalendarsDstCount] = useState(0);
  const [filterListsCount, setFilterListsCount] = useState(0);

  const { canGetFilters, canCreateFilter, canGetCalendars, canCreateCalendar } = useContext(
    AnomalyDetectionSettingsContext
  );

  const { displayErrorToast } = useToastNotificationService();
  const redirectToCalendarList = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_MANAGE);
  const redirectToCalendarDstList = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_DST_MANAGE);
  const redirectToNewCalendarPage = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_NEW);
  const redirectToNewCalendarDstPage = useCreateAndNavigateToMlLink(ML_PAGES.CALENDARS_DST_NEW);
  const redirectToFilterLists = useCreateAndNavigateToMlLink(ML_PAGES.FILTER_LISTS_MANAGE);
  const redirectToNewFilterListPage = useCreateAndNavigateToMlLink(ML_PAGES.FILTER_LISTS_NEW);

  useEffect(() => {
    loadSummaryStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummaryStats() {
    // Obtain the counts of calendars and filter lists.
    if (canGetCalendars === true) {
      try {
        const { calendarsDst, calendars } = separateCalendarsByType(await mlApi.calendars());
        setCalendarsCount(calendars.length);
        setCalendarsDstCount(calendarsDst.length);
      } catch (e) {
        displayErrorToast(
          e,
          i18n.translate('xpack.ml.settings.anomalyDetection.loadingCalendarsCountErrorMessage', {
            defaultMessage: 'An error occurred obtaining the count of calendars',
          })
        );
      }
    }

    if (canGetFilters === true) {
      try {
        const filterLists = await mlApi.filters.filtersStats();
        setFilterListsCount(filterLists.length);
      } catch (e) {
        displayErrorToast(
          e,
          i18n.translate('xpack.ml.settings.anomalyDetection.loadingFilterListCountErrorMessage', {
            defaultMessage: 'An error occurred obtaining the count of filter lists',
          })
        );
      }
    }
  }

  return (
    <Fragment>
      <EuiTitle>
        <h2>
          <FormattedMessage
            id="xpack.ml.settings.anomalyDetection.anomalyDetectionTitle"
            defaultMessage="Anomaly Detection"
          />
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.ml.settings.anomalyDetection.calendarsTitle"
                defaultMessage="Calendars"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.calendarsText"
                  defaultMessage="Calendars contain a list of scheduled events for which you do not want to generate anomalies, such as planned system outages or public holidays."
                />
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center">
            {canGetCalendars && (
              <EuiFlexItem grow={false} style={{ display: 'block' }}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.settings.anomalyDetection.calendarsSummaryCount"
                    defaultMessage="You have {calendarsCountBadge} {calendarsCount, plural, one {calendar} other {calendars}}"
                    values={{
                      calendarsCountBadge: <EuiBadge>{calendarsCount}</EuiBadge>,
                      calendarsCount,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlCalendarsMngButton"
                flush="left"
                color="primary"
                onClick={redirectToCalendarList}
                isDisabled={canGetCalendars === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.manageCalendarsLink"
                  defaultMessage="Manage"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlCalendarsCreateButton"
                flush="left"
                color="primary"
                onClick={redirectToNewCalendarPage}
                isDisabled={canCreateCalendar === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.createCalendarLink"
                  defaultMessage="Create"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.ml.settings.anomalyDetection.calendarsDstTitle"
                defaultMessage="DST Calendars"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.calendarsDstText"
                  defaultMessage="DST calendars contain a list of scheduled events for which you do not want to generate anomalies, taking into account daylight saving time shifts that may cause events to occur one hour earlier or later."
                />
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center">
            {canGetCalendars && (
              <EuiFlexItem grow={false} style={{ display: 'block' }}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.settings.anomalyDetection.calendarsDstSummaryCount"
                    defaultMessage="You have {calendarsCountBadge} {calendarsDstCount, plural, one {calendar} other {calendars}}"
                    values={{
                      calendarsCountBadge: <EuiBadge>{calendarsDstCount}</EuiBadge>,
                      calendarsDstCount,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlCalendarsDstMngButton"
                flush="left"
                color="primary"
                onClick={redirectToCalendarDstList}
                isDisabled={canGetCalendars === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.manageCalendarsDstLink"
                  defaultMessage="Manage"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlCalendarsDstCreateButton"
                flush="left"
                color="primary"
                onClick={redirectToNewCalendarDstPage}
                isDisabled={canCreateCalendar === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.createCalendarDstLink"
                  defaultMessage="Create"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xl" />

      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>
              <FormattedMessage
                id="xpack.ml.settings.anomalyDetection.filterListsTitle"
                defaultMessage="Filter Lists"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <EuiTextColor color="subdued">
              <p>
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.filterListsText"
                  defaultMessage="Filter lists contain values that you can use to include or exclude events from the machine learning analysis."
                />
              </p>
            </EuiTextColor>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup alignItems="center">
            {canGetFilters && (
              <EuiFlexItem grow={false}>
                <EuiText>
                  <FormattedMessage
                    id="xpack.ml.settings.anomalyDetection.filterListsSummaryCount"
                    defaultMessage="You have {filterListsCountBadge} {filterListsCount, plural, one {filter list} other {filter lists}}"
                    values={{
                      filterListsCountBadge: <EuiBadge>{filterListsCount}</EuiBadge>,
                      filterListsCount,
                    }}
                  />
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlFilterListsMngButton"
                flush="left"
                color="primary"
                onClick={redirectToFilterLists}
                isDisabled={canGetFilters === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.manageFilterListsLink"
                  defaultMessage="Manage"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="mlFilterListsCreateButton"
                color="primary"
                onClick={redirectToNewFilterListPage}
                isDisabled={canCreateFilter === false}
              >
                <FormattedMessage
                  id="xpack.ml.settings.anomalyDetection.createFilterListsLink"
                  defaultMessage="Create"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem />
      </EuiFlexGroup>
    </Fragment>
  );
};
