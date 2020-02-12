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
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import styled from 'styled-components';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { fontSize, pct, px, units } from '../../../style/variables';
import { ElasticDocsLink } from '../../shared/Links/ElasticDocsLink';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';

export const APMIndicesPermission: React.FC = ({ children }) => {
  const [
    isPermissionWarningDismissed,
    setIsPermissionWarningDismissed
  ] = useState(false);

  const { data: indicesPrivileges = {}, status } = useFetcher(callApmApi => {
    return callApmApi({
      pathname: '/api/apm/security/indices_privileges'
    });
  }, []);

  // Return null until receive the reponse of the api.
  if (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING) {
    return null;
  }

  const indicesPrivilegesKeys = Object.keys(indicesPrivileges);
  const indicesWithoutPermission = indicesPrivilegesKeys.filter(
    index => !indicesPrivileges[index].read
  );

  // Show permission warning when a user has at least one index without Read privilege,
  // and he has not manually dismissed the warning
  if (!isEmpty(indicesWithoutPermission) && !isPermissionWarningDismissed) {
    return (
      <PermissionWarning
        indicesWithoutPermission={indicesWithoutPermission}
        // Show escape hatch button if the index pattern was used to check the privileges
        // or if at least one index has read privilege
        showEscapeHatch={
          indicesPrivilegesKeys.some(index => index === 'apm-*') ||
          indicesPrivilegesKeys.length !== indicesWithoutPermission.length
        }
        onEscapeHatchClick={() => setIsPermissionWarningDismissed(true)}
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
  indicesWithoutPermission: string[];
  showEscapeHatch: boolean;
  onEscapeHatchClick: () => void;
}

const PermissionWarning = ({
  indicesWithoutPermission,
  showEscapeHatch,
  onEscapeHatchClick
}: Props) => {
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
                <>
                  <p>
                    {i18n.translate('xpack.apm.permission.description', {
                      defaultMessage:
                        'We’ve detected your current role in Kibana does not grant you access to the APM data. Please check with your Kibana administrator to get the proper privileges granted to start using APM.'
                    })}
                  </p>
                  <>
                    <EuiText size="s">
                      <span style={{ fontWeight: 'bold' }}>
                        {i18n.translate('xpack.apm.permission.missingIndices', {
                          defaultMessage: 'Missing indices permissions:'
                        })}
                      </span>
                    </EuiText>
                    <ul style={{ listStyleType: 'none' }}>
                      {indicesWithoutPermission.map(index => (
                        <li key={index} style={{ marginTop: units.half }}>
                          <EuiText size="s">{index}</EuiText>
                        </li>
                      ))}
                    </ul>
                  </>
                </>
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

                  {showEscapeHatch && (
                    <EscapeHatch>
                      <EuiLink
                        color="subdued"
                        onClick={onEscapeHatchClick}
                        style={{ fontSize }}
                      >
                        {i18n.translate('xpack.apm.permission.dismissWarning', {
                          defaultMessage: 'Dismiss'
                        })}
                      </EuiLink>
                    </EscapeHatch>
                  )}
                </>
              }
            />
          </EuiPanel>
        </div>
      </CentralizedContainer>
    </div>
  );
};
