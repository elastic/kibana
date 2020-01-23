/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'src/core/public';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface HeaderProps {
  breadcrumbs?: ChromeBreadcrumb[];
  readOnlyBadge?: boolean;
}

export const Header = ({ breadcrumbs = [], readOnlyBadge = false }: HeaderProps) => {
  const chrome = useKibana().services.chrome;

  const badge = readOnlyBadge
    ? {
        text: i18n.translate('xpack.infra.header.badge.readOnly.text', {
          defaultMessage: 'Read only',
        }),
        tooltip: i18n.translate('xpack.infra.header.badge.readOnly.tooltip', {
          defaultMessage: 'Unable to change source configuration',
        }),
        iconType: 'glasses',
      }
    : undefined;

  const setBreadcrumbs = useCallback(() => {
    return chrome?.setBreadcrumbs(breadcrumbs || []);
  }, [breadcrumbs, chrome]);

  const setBadge = useCallback(() => {
    return chrome?.setBadge(badge);
  }, [badge, chrome]);

  useEffect(() => {
    setBreadcrumbs();
    setBadge();
  }, [setBreadcrumbs, setBadge]);

  useEffect(() => {
    setBreadcrumbs();
  }, [breadcrumbs, setBreadcrumbs]);

  useEffect(() => {
    setBadge();
  }, [badge, setBadge]);

  return null;
};
