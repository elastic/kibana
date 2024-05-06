/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiLink } from '@elastic/eui';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import React from 'react';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { truncate } from '../../../../utils/style';

const StyledLink = euiStyled(EuiLink)`${truncate('100%')};`;

interface Props {
  serverlessFunctionName: string;
  serverlessId: string;
}

export function ServerlessFunctionNameLink({
  serverlessFunctionName,
  serverlessId,
}: Props) {
  const { serviceName } = useApmServiceContext();
  const { query } = useApmParams('/services/{serviceName}/metrics');
  const { link } = useApmRouter();
  return (
    <StyledLink
      href={link('/services/{serviceName}/metrics/{id}', {
        path: {
          serviceName,
          id: serverlessId,
        },
        query,
      })}
    >
      {serverlessFunctionName}
    </StyledLink>
  );
}
