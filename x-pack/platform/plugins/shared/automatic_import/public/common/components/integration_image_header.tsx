/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiImage, EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import integrationsImage from '../images/integrations_light.svg';

const headerCss = css`
  > div {
    padding-block: 0;
  }
`;
const imageCss = css`
  width: 318px;
  height: 183px;
  object-fit: cover;
  object-position: center top;
`;

export const IntegrationImageHeader = React.memo(() => {
  return (
    <KibanaPageTemplate.Header css={headerCss}>
      <EuiFlexGroup direction="column" alignItems="center">
        <EuiFlexItem>
          <EuiSpacer size="xl" />
          <EuiImage alt="create integration background" src={integrationsImage} css={imageCss} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Header>
  );
});
IntegrationImageHeader.displayName = 'IntegrationImageHeader';
