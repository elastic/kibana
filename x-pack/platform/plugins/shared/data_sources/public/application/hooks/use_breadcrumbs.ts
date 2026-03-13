/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

export interface DataSourcesBreadcrumb {
  text: string;
  href?: string;
}

export const useBreadcrumbs = (breadcrumbs: DataSourcesBreadcrumb[] = []) => {
  const {
    services: { chrome },
  } = useKibana();

  useEffect(() => {
    const rootBreadcrumb = {
      text: i18n.translate('xpack.dataSources.breadcrumbs.root', {
        defaultMessage: 'Sources',
      }),
      href: undefined,
    };

    chrome?.setBreadcrumbs([rootBreadcrumb, ...breadcrumbs]);
  }, [chrome, breadcrumbs]);
};
