/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiCallOut } from '@elastic/eui';
import lightTheme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import React from 'react';
import styled from 'styled-components';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';

const EmptyBannerCallOut = styled(EuiCallOut)`
  margin: ${lightTheme.gutterTypes.gutterSmall};
  /* Add some extra margin so it displays to the right of the controls. */
  margin-left: calc(
    ${lightTheme.gutterTypes.gutterLarge} +
      ${lightTheme.gutterTypes.gutterExtraLarge}
  );
  position: absolute;
  width: 95%;
  z-index: 1;
`;

export function EmptyBanner() {
  return (
    <EmptyBannerCallOut
      title={i18n.translate('xpack.apm.serviceMap.emptyBanner.title', {
        defaultMessage: "Looks like there's only a single service."
      })}
    >
      {i18n.translate('xpack.apm.serviceMap.emptyBanner.message', {
        defaultMessage:
          "We will map out connected services and external requests if we can detect them. Please make sure you're running the latest version of the APM agent."
      })}{' '}
      <ElasticDocsLink section="/apm/get-started" path="/agents.html">
        {i18n.translate('xpack.apm.serviceMap.emptyBanner.docsLink', {
          defaultMessage: 'Learn more in the docs'
        })}
      </ElasticDocsLink>
    </EmptyBannerCallOut>
  );
}
