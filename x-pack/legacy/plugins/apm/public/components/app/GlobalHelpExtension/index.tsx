/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import url from 'url';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import { useKibanaCore } from '../../../../../observability/public';

export const GlobalHelpExtension: React.SFC = () => {
  const core = useKibanaCore();

  return (
    <EuiText size="s">
      <EuiLink
        href={url.format({
          pathname: core.http.basePath.prepend('/app/kibana'),
          hash: '/management/elasticsearch/upgrade_assistant'
        })}
      >
        {i18n.translate('xpack.apm.helpMenu.upgradeAssistantLink', {
          defaultMessage: 'Upgrade assistant'
        })}
      </EuiLink>
    </EuiText>
  );
};
