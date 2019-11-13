/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { useKibanaCore } from '../../../../../observability/public';

export const useUpdateBadgeEffect = () => {
  const { chrome, application } = useKibanaCore();
  const { capabilities } = application;

  useEffect(() => {
    chrome.setBadge(
      !capabilities.apm.save
        ? {
            text: i18n.translate('xpack.apm.header.badge.readOnly.text', {
              defaultMessage: 'Read only'
            }),
            tooltip: i18n.translate('xpack.apm.header.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save'
            }),
            iconType: 'glasses'
          }
        : undefined
    );
  }, [capabilities, chrome]);
};
