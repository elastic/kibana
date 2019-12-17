/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { EuiCallOut, EuiPageBody, EuiPageContent, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import useInterval from '@use-it/interval';
import { AGENT_POLLING_INTERVAL } from '../../../common/constants/agent';
import { Loading } from '../../components';
import { AgentEventsTable, AgentDetailSection } from './components';
import { useGetAgent, AgentRefreshContext } from './hooks';

export const Layout: React.FC = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

type Props = RouteComponentProps<{
  agentId: string;
}>;

export const AgentDetailsPage: React.FC<Props> = ({
  match: {
    params: { agentId },
  },
}) => {
  const [lastPolledAgentsMs, setLastPolledAgentsMs] = useState<number>(0);
  const { agent, isLoading, error, refreshAgent } = useGetAgent(agentId);

  // Poll for agents on interval
  useInterval(() => {
    if (new Date().getTime() - lastPolledAgentsMs >= AGENT_POLLING_INTERVAL) {
      setLastPolledAgentsMs(new Date().getTime());
      refreshAgent();
    }
  }, AGENT_POLLING_INTERVAL);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <Layout>
        <EuiCallOut
          title={i18n.translate('xpack.fleet.agentDetails.unexceptedErrorTitle', {
            defaultMessage: 'An error happened while loading the agent',
          })}
          color="danger"
          iconType="alert"
        >
          <p>
            <EuiText>{error.message}</EuiText>
          </p>
        </EuiCallOut>
      </Layout>
    );
  }

  if (!agent) {
    return (
      <Layout>
        <FormattedMessage
          id="xpack.fleet.agentDetails.agentNotFoundErrorTitle"
          defaultMessage="Agent Not found"
        />
      </Layout>
    );
  }

  return (
    <AgentRefreshContext.Provider value={{ refresh: refreshAgent }}>
      <Layout>
        <AgentDetailSection agent={agent} />
        <EuiSpacer size="xl" />
        <AgentEventsTable agent={agent} />
      </Layout>
    </AgentRefreshContext.Provider>
  );
};
