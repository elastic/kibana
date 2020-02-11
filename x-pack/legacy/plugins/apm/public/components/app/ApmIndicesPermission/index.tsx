/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import styled from 'styled-components';
import { IndexPrivileges } from '../../../../typings/es_schemas/raw/IndexPrivileges';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { fontSize, pct, px, units } from '../../../style/variables';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';

export const ApmIndicesPermission: React.FC = ({ children }) => {
  const [
    isPermissionWarningDismissed,
    setIsPermissionWarningDismissed
  ] = useState(false);

  const { data = {} as IndexPrivileges['index'], status } = useFetcher(
    callApmApi => {
      return callApmApi({
        pathname: '/api/apm/security/indicesPrivileges'
      });
    },
    []
  );

  // TODO: check indices privileges to show permission page.

  // Return null until receive the reponse of the api.
  // TODO: test removing it
  if (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING) {
    return null;
  }
  // When the user doesn't have the appropriate permissions and they
  // did not use the escape hatch, show the missing permissions page
  if (data?.hasPermission === false && !isPermissionWarningDismissed) {
    return (
      <PermissionPage
        onEscapeHatchClick={() => setIsPermissionWarningDismissed(false)}
      />
    );
  }

  return <>{children}</>;
};

const CentralizedContainer = styled.div`
  height: ${pct(100)};
  display: flex;
  justify-content: center;
  align-items: center;
`;

const EscapeHatch = styled.div`
  width: ${pct(100)};
  margin-top: ${px(units.plus)};
  justify-content: center;
  display: flex;
`;

interface Props {
  onEscapeHatchClick: () => void;
}

const PermissionPage = ({ onEscapeHatchClick }: Props) => {
  return (
    <div style={{ height: pct(95) }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>
              {i18n.translate('xpack.apm.permission.apm', {
                defaultMessage: 'APM'
              })}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SetupInstructionsLink />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CentralizedContainer>
        <div>
          <EuiPanel paddingSize="none">
            <EuiEmptyPrompt
              iconType="apmApp"
              iconColor={''}
              title={
                <h2>
                  {i18n.translate('xpack.apm.permission.title', {
                    defaultMessage: 'Missing permissions to access APM'
                  })}
                </h2>
              }
              body={
                <p>
                  {i18n.translate('xpack.apm.permission.description', {
                    defaultMessage:
                      "We've detected your current role in Kibana does not grant you access to the APM data. Please check with your Kibana administrator to get the proper privileges granted in order to start using APM."
                  })}
                </p>
              }
              actions={
                <>
                  <ElasticDocsLink
                    section="/apm/server"
                    path="/feature-roles.html"
                  >
                    {(href: string) => (
                      <EuiButton color="primary" fill href={href}>
                        {i18n.translate('xpack.apm.permission.learnMore', {
                          defaultMessage: 'Learn more about APM permissions'
                        })}
                      </EuiButton>
                    )}
                  </ElasticDocsLink>

                  <EscapeHatch>
                    <EuiLink
                      color="subdued"
                      onClick={onEscapeHatchClick}
                      style={{ fontSize }}
                    >
                      {i18n.translate('xpack.apm.permission.dismissWarning', {
                        defaultMessage: 'Dismiss warning'
                      })}
                    </EuiLink>
                  </EscapeHatch>
                </>
              }
            />
          </EuiPanel>
        </div>
      </CentralizedContainer>
    </div>
  );
};
