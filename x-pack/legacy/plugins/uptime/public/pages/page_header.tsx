/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Link } from 'react-router-dom';
import { UptimeDatePicker } from '../components/functional/uptime_date_picker';
import { SETTINGS_ROUTE } from '../../common/constants';

interface PageHeaderProps {
  headingText: string;
  extraLinks?: boolean;
  datePicker?: boolean;
}

export const PageHeader = React.memo(
  ({ headingText, extraLinks = false, datePicker = true }: PageHeaderProps) => {
    const datePickerComponent = datePicker ? (
      <EuiFlexItem grow={false}>
        <UptimeDatePicker />
      </EuiFlexItem>
    ) : null;

    const settingsLinkText = i18n.translate('xpack.uptime.page_header.settingsLink', {
      defaultMessage: 'Settings',
    });
    const extraLinkComponents = !extraLinks ? null : (
      <EuiFlexItem grow={false}>
        <Link to={`${SETTINGS_ROUTE}`}>
          <EuiButtonEmpty data-test-subj="settings-page-link">{settingsLinkText}</EuiButtonEmpty>
        </Link>
      </EuiFlexItem>
    );

    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap={true}>
          <EuiFlexItem>
            <EuiTitle>
              <h1>{headingText}</h1>
            </EuiTitle>
          </EuiFlexItem>
          {extraLinkComponents}
          {datePickerComponent}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
      </>
    );
  }
);
