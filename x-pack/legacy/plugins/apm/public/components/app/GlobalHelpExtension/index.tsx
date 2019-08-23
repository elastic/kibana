/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import url from 'url';
import { px, units } from '../../../style/variables';
import { useKibanaCore } from '../../../../../observability/public';

const Container = styled.div`
  margin: ${px(units.minus)} 0;
`;

export const GlobalHelpExtension: React.SFC = () => {
  const core = useKibanaCore();

  return (
    <Fragment>
      <Container>
        <EuiLink
          href="https://discuss.elastic.co/c/apm"
          target="_blank"
          rel="noopener"
        >
          {i18n.translate('xpack.apm.feedbackMenu.provideFeedbackTitle', {
            defaultMessage: 'Provide feedback for APM'
          })}
        </EuiLink>
      </Container>
      <Container>
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
      </Container>
    </Fragment>
  );
};
