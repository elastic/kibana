/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { PropTypes } from 'prop-types';

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageContentHeader,
  EuiPageContent,
  EuiPageBody,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { useUiChromeContext } from '../contexts/ui/use_ui_chrome_context';
import { NavigationMenu } from '../components/navigation_menu';

export function Settings({ canGetFilters, canGetCalendars }) {
  const basePath = useUiChromeContext().getBasePath();

  return (
    <Fragment>
      <NavigationMenu tabId="settings" />
      <EuiPage className="mlSettingsPage" data-test-subj="mlPageSettings">
        <EuiPageBody className="mlSettingsPage__body">
          <EuiPageContent className="mlSettingsPage__content" horizontalPosition="center">
            <EuiPageContentHeader>
              <EuiTitle>
                <h2>
                  <FormattedMessage
                    id="xpack.ml.settings.jobManagementTitle"
                    defaultMessage="Job Management"
                  />
                </h2>
              </EuiTitle>
            </EuiPageContentHeader>

            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="ml_calendar_mng_button"
                  size="l"
                  color="primary"
                  href={`${basePath}/app/ml#/settings/calendars_list`}
                  isDisabled={canGetCalendars === false}
                >
                  <FormattedMessage
                    id="xpack.ml.settings.calendarManagementButtonLabel"
                    defaultMessage="Calendar management"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="ml_filter_lists_button"
                  size="l"
                  color="primary"
                  href={`${basePath}/app/ml#/settings/filter_lists`}
                  isDisabled={canGetFilters === false}
                >
                  <FormattedMessage
                    id="xpack.ml.settings.filterListsButtonLabel"
                    defaultMessage="Filter Lists"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPageContent>
        </EuiPageBody>
      </EuiPage>
    </Fragment>
  );
}

Settings.propTypes = {
  canGetFilters: PropTypes.bool.isRequired,
  canGetCalendars: PropTypes.bool.isRequired,
};
