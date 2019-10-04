/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { Breadcrumb } from 'ui/chrome/api/breadcrumbs';
import { WithKibanaChrome } from '../../containers/with_kibana_chrome';
import { ExternalHeader } from './external_header';

interface HeaderProps {
  breadcrumbs?: Breadcrumb[];
  readOnlyBadge?: boolean;
}

export const Header = ({ breadcrumbs = [], readOnlyBadge = false }: HeaderProps) => (
  <WithKibanaChrome>
    {({ setBreadcrumbs, setBadge }) => (
      <ExternalHeader
        breadcrumbs={breadcrumbs}
        setBreadcrumbs={setBreadcrumbs}
        badge={
          readOnlyBadge
            ? {
                text: i18n.translate('xpack.infra.header.badge.readOnly.text', {
                  defaultMessage: 'Read only',
                }),
                tooltip: i18n.translate('xpack.infra.header.badge.readOnly.tooltip', {
                  defaultMessage: 'Unable to change source configuration',
                }),
                iconType: 'glasses',
              }
            : undefined
        }
        setBadge={setBadge}
      />
    )}
  </WithKibanaChrome>
);
