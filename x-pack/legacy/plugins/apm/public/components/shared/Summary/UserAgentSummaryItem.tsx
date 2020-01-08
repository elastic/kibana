/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import { EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserAgent } from '../../../../typings/es_schemas/raw/fields/UserAgent';

type UserAgentSummaryItemProps = UserAgent;

const Version = styled('span')`
  font-size: ${theme.euiFontSizeS};
`;

export function UserAgentSummaryItem({
  name,
  version
}: UserAgentSummaryItemProps) {
  return (
    <EuiToolTip
      content={i18n.translate(
        'xpack.apm.transactionDetails.userAgentAndVersionLabel',
        {
          defaultMessage: 'User agent & version'
        }
      )}
    >
      <>
        {name}&nbsp;
        {version && <Version>({version})</Version>}
      </>
    </EuiToolTip>
  );
}
