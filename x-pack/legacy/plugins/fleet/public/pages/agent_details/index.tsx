/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { SFC } from 'react';
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
  EuiSpacer,
} from '@elastic/eui';
import { RouteComponentProps } from 'react-router-dom';
import { AgentEventsTable } from './components/agent_events_table';
import { Loading } from '../../components/loading';
import { AgentDetailSection } from './components/details_section';
import { ModalConfirmUnenroll } from './components/modal_confirm_unenroll';
import { useUnenroll } from './hooks/use_unenroll';
import { useGetAgent, AgentRefreshContext } from './hooks/use_agent';

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
  const { agent, isLoading, error, refreshAgent } = useGetAgent(agentId);
  const unenroll = useUnenroll(refreshAgent, agentId);

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
        {unenroll.state.confirm && (
          <ModalConfirmUnenroll
            onCancel={unenroll.clear}
            onConfirm={unenroll.confirmUnenrollement}
          />
        )}
        <AgentDetailSection
          onClickUnenroll={unenroll.showConfirmModal}
          agent={agent}
          unenrollment={{ loading: unenroll.state.loading }}
        />
        <EuiSpacer size="xl" />
        <AgentEventsTable agent={agent} />
        <EuiFlexGroup gutterSize="xl">
          <EuiFlexItem grow={3}>
            <EuiFlexItem grow={null}>
              <EuiHorizontalRule />
            </EuiFlexItem>
            <EuiFlexItem grow={null}>
              <EuiHorizontalRule />
            </EuiFlexItem>
            <EuiFlexItem grow={null}></EuiFlexItem>
          </EuiFlexItem>
          <EuiFlexItem grow={7}>
            <EuiFlexItem grow={null}></EuiFlexItem>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Layout>
    </AgentRefreshContext.Provider>
  );
};
