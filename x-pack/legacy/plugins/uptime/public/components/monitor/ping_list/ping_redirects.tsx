/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { EuiIcon, EuiLink, EuiPopover, EuiSpacer, EuiText, EuiButtonEmpty } from '@elastic/eui';
import { Ping } from '../../../../../common/runtime_types/ping';

const StyledLink = styled(EuiLink)`
  margin-right: 5px;
  margin-left: 5px;
`;

interface Props {
  monitorStatus: Ping;
}

export const PingRedirects: React.FC<Props> = ({ monitorStatus }) => {
  const monitorUrl = monitorStatus?.url?.full;

  const list = monitorStatus?.http?.response?.redirects;

  return list ? (
    <div>
      <EuiText size="xs">
        <h3>
          {i18n.translate('xpack.uptime.monitorList.redirects.title', {
            defaultMessage: 'Redirects',
          })}
        </h3>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText>
        {i18n.translate('xpack.uptime.monitorList.redirects.description', {
          defaultMessage: 'Heartbeat followed {number} redirects while executing ping.',
          values: {
            number: list?.length ?? 0,
          },
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <StyledLink href={monitorUrl}>{monitorUrl}</StyledLink>
      {list.map(url => {
        return (
          <div>
            <div>
              <EuiIcon type="sortDown" />
            </div>
            <StyledLink href={url}>{url}</StyledLink>
          </div>
        );
      })}
    </div>
  ) : null;
};
