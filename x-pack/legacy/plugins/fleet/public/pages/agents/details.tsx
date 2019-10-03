/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, SFC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPageBody,
  EuiPageContent,
  EuiCallOut,
  EuiText,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { AgentsLib } from '../../lib/agent';
import { Agent } from '../../../common/types/domain_data';
import { AgentEventsTable } from '../../components/agent_details/agent_events_table';
import { Loading } from '../../components/loading';
import { PolicySection } from '../../components/agent_details/policy_section';
import { AgentDetailSection } from '../../components/agent_details/details_section';
import { AgentMetadataSection } from '../../components/agent_details/metadata_section';

function useGetAgent(agents: AgentsLib, id: string) {
  const [state, setState] = useState<{
    isLoading: boolean;
    agent: Agent | null;
    error: Error | null;
  }>({
    isLoading: false,
    agent: null,
    error: null,
  });

  const fetchAgent = async () => {
    setState({
      isLoading: true,
      agent: null,
      error: null,
    });
    try {
      const agent = await agents.get(id);
      setState({
        isLoading: false,
        agent,
        error: null,
      });
    } catch (error) {
      setState({
        isLoading: false,
        agent: null,
        error,
      });
    }
  };
  useEffect(() => {
    fetchAgent();
  }, [id]);

  return {
    ...state,
  };
}

export const Layout: SFC = ({ children }) => (
  <EuiPageBody>
    <EuiPageContent>{children}</EuiPageContent>
  </EuiPageBody>
);

type Props = {
  libs: { agents: AgentsLib };
} & RouteComponentProps<{
  agentId: string;
}>;

export const AgentDetailsPage: SFC<Props> = ({
  libs: { agents },
  match: {
    params: { agentId },
  },
}) => {
  const { agent, isLoading, error } = useGetAgent(agents, agentId);
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
    <Layout>
      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem grow={3}>
          <AgentDetailSection agent={agent} />
          <EuiHorizontalRule />
          <PolicySection agent={agent} />
          <EuiHorizontalRule />
          <AgentMetadataSection agent={agent} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <AgentEventsTable agents={agents} agent={agent} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Layout>
  );
};
