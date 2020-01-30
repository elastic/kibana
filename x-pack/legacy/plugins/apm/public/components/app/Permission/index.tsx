/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { matchPath } from 'react-router-dom';
import styled from 'styled-components';
import { useLocation } from '../../../hooks/useLocation';
import { pct, px, unit } from '../../../style/variables';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { routes } from '../Main/route_config';
import { useFetcher, FETCH_STATUS } from '../../../hooks/useFetcher';

export const Permission: React.FC = ({ children }) => {
  const [isPermissionPageEnabled, touglePermissionPage] = useState(true);

  const { data, status } = useFetcher(callApmApi => {
    return callApmApi({
      pathname: '/api/apm/security/permissions'
    });
  }, []);

  // Return null until receive the reponse of the api.
  if (status === FETCH_STATUS.LOADING || status === FETCH_STATUS.PENDING) {
    return null;
  }
  // When the user doenst have permission and he didnt escape, show the Permission page
  if (!data?.hasPermission && isPermissionPageEnabled) {
    return (
      <PermissionPage onEscapeHatchClick={() => touglePermissionPage(false)} />
    );
  }

  return <>{children}</>;
};

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const EscapeHatch = styled(EuiButtonEmpty)`
  display: block;
  color: rgb(105, 112, 125);
  width: ${pct(100)};
  margin-top: ${px(unit)};
`;

interface Props {
  onEscapeHatchClick: () => void;
}

const PermissionPage: React.FC<Props> = ({ onEscapeHatchClick }) => {
  const { pathname } = useLocation();
  const route = useMemo(
    () =>
      routes.filter(({ path }) =>
        matchPath(pathname, {
          path,
          exact: true
        })
      ),
    [pathname]
  );

  return (
    <div style={{ height: pct(95) }}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>APM </h1>
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
              // @ts-ignore
              iconColor={null}
              title={<h2>Missing permissions to access APM</h2>}
              body={
                <p>
                  {`We've detected your current role in Kibana does not grant you access
                      to the APM data. Please check with your Kibana administrator to get
                      the proper priviledges granted in order to start using APM.`}
                </p>
              }
              actions={
                <>
                  <EuiButton
                    color="primary"
                    fill
                    href="https://www.elastic.co/guide/en/apm/server/current/feature-roles.html"
                  >
                    Learn more about APM permissions
                  </EuiButton>
                  <EscapeHatch onClick={onEscapeHatchClick} size="xs">
                    Skip and go to {route[0]?.breadcrumb} overview
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
