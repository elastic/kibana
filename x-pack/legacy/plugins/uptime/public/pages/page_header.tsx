/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { ChromeBreadcrumb } from 'kibana/public';
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UptimeDatePicker } from '../components/functional/uptime_date_picker';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useUrlParams } from '../hooks';
import { UptimeUrlParams } from '../lib/helper';

interface PageHeaderProps {
  headingText: string;
  breadcrumbs: ChromeBreadcrumb[];
  datePicker: boolean;
}

export const makeBaseBreadcrumb = (params?: UptimeUrlParams): ChromeBreadcrumb => {
  const href = params ? '#/' + stringifyUrlParams(params, true) : '#/';
  return {
    text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
      defaultMessage: 'Uptime',
    }),
    href,
  };
};

export const PageHeader = ({ headingText, breadcrumbs, datePicker = true }: PageHeaderProps) => {
  const setBreadcrumbs = useKibana().services.chrome?.setBreadcrumbs!;

  const params = useUrlParams()[0]();
  useEffect(() => {
    setBreadcrumbs([makeBaseBreadcrumb(params)].concat(breadcrumbs));
  }, [breadcrumbs, params, setBreadcrumbs]);

  const datePickerComponent = datePicker ? (
    <EuiFlexItem grow={false}>
      <UptimeDatePicker />
    </EuiFlexItem>
  ) : null;

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" wrap={true}>
        <EuiFlexItem>
          <EuiTitle>
            <h1>{headingText}</h1>
          </EuiTitle>
        </EuiFlexItem>
        {datePickerComponent}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
