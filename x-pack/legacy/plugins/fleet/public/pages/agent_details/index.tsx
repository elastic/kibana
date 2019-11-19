/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { SFC, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiCallOut, EuiText, EuiSpacer } from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import useInterval from '@use-it/interval';
import { Loading } from '../../components/loading';
import { AgentEventsTable } from './components/agent_events_table';
import { AgentDetailSection } from './components/details_section';
import { useGetAgent, AgentRefreshContext } from './hooks/use_agent';
import { AGENT_POLLING_INTERVAL } from '../../../common/constants/agent';

export const Layout: SFC = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

type Props = RouteComponentProps<{
  agentId: string;
}>;

export const AgentDetailsPage: SFC<Props> = ({
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
  }, 1000);

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
