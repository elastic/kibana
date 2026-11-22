/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  ExternalTicketConnector,
  ExternalTicketResponse,
  InvestigationRecord,
} from '../../../../common/investigations/types';
import { ConnectorsDropdown } from '../../../components/configure_cases/connectors_dropdown';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import type { ActionConnector } from '../../../containers/configure/types';
import { ICONS } from '../../icons';
import { ErrorState } from '../shared/error_state';
import { RelativeTime } from '../shared/relative_time';
import { SideCard } from '../detail/side_card';
import {
  usePushExternalTicket,
  useSyncExternalTicket,
  useUpdateExternalTicket,
  useExternalTicket,
} from './use_external_ticket';
import * as i18n from './translations';

const NO_CONNECTOR_ID = 'none';

/** Cases connectors for the dropdown, from the id, name and type the server returns. */
const toActionConnectors = (connectors: ExternalTicketResponse['connectors']): ActionConnector[] =>
  connectors.map(({ id, name, type }) => ({
    id,
    name,
    actionTypeId: type,
    isPreconfigured: false,
    isDeprecated: false,
    isConnectorTypeDeprecated: false,
    isSystemAction: false,
    referencedByCount: 0,
  }));

interface IncidentProps {
  ticket: ExternalTicketResponse;
  connector: ExternalTicketConnector;
}

/** The incident the last push created: its id as a link to the ticket, and who pushed when. */
const Incident: React.FC<IncidentProps> = ({ ticket, connector }) => {
  const service = ticket.external_service;
  if (!service || service.connector_id !== connector.id) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationTicketNotPushed">
        {i18n.NOT_PUSHED}
      </EuiText>
    );
  }
  const by = service.pushed_by.full_name || service.pushed_by.username || '';

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {i18n.INCIDENT_LABEL}{' '}
          <EuiLink
            href={service.external_url}
            target="_blank"
            external
            aria-label={i18n.OPEN_INCIDENT_ARIA(service.external_id, connector.name)}
            data-test-subj="investigationTicketLink"
          >
            {service.external_title || service.external_id}
          </EuiLink>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued" data-test-subj="investigationTicketPushedAt">
          {i18n.PUSHED_BY(by)} <RelativeTime value={service.pushed_at} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
Incident.displayName = 'Incident';

interface TicketBodyProps {
  recordId: string;
  ticket: ExternalTicketResponse;
  canUpdate: boolean;
  canPush: boolean;
}

const TicketBody: React.FC<TicketBodyProps> = ({ recordId, ticket, canUpdate, canPush }) => {
  const { euiTheme } = useEuiTheme();
  const { connector, connectors } = ticket;
  const actionConnectors = useMemo(() => toActionConnectors(connectors), [connectors]);
  const { mutate: update, isLoading: isUpdating } = useUpdateExternalTicket(
    recordId,
    i18n.CONNECTOR_CHANGE_ERROR
  );
  const { mutate: setAutoPush, isLoading: isSwitching } = useUpdateExternalTicket(
    recordId,
    i18n.AUTO_PUSH_ERROR
  );
  const { mutate: push, isLoading: isPushing } = usePushExternalTicket(recordId);
  const { mutate: sync, isLoading: isSyncing } = useSyncExternalTicket(recordId);

  const changeConnector = (id: string) => {
    if (id === (connector?.id ?? NO_CONNECTOR_ID)) return;
    const next = connectors.find((candidate) => candidate.id === id);
    update({
      connector: next ? { id: next.id, name: next.name, type: next.type, fields: null } : null,
    });
  };

  const pushed = Boolean(connector && ticket.has_been_pushed);
  const lastSync = ticket.last_sync;

  return (
    <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFormRow
          label={i18n.CONNECTOR_LABEL}
          fullWidth
          helpText={connector ? undefined : connectors.length ? i18n.CONNECTOR_HELP : undefined}
        >
          <ConnectorsDropdown
            connectors={actionConnectors}
            disabled={!canUpdate || isUpdating}
            isLoading={isUpdating}
            onChange={changeConnector}
            selectedConnector={connector?.id ?? NO_CONNECTOR_ID}
          />
        </EuiFormRow>
        {connectors.length === 0 ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationTicketNoConnectors">
            {i18n.NO_CONNECTORS}
          </EuiText>
        ) : null}
      </EuiFlexItem>

      {connector ? (
        <>
          <EuiFlexItem grow={false}>
            <Incident ticket={ticket} connector={connector} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {!pushed || ticket.needs_update ? (
              <div>
                <EuiButton
                  size="s"
                  fill={!pushed}
                  iconType={ICONS.upload}
                  isLoading={isPushing}
                  isDisabled={!canPush}
                  onClick={() => push({ connectorName: connector.name, update: pushed })}
                  data-test-subj="investigationTicketPush"
                >
                  {pushed ? i18n.UPDATE_INCIDENT(connector.name) : i18n.PUSH_AS(connector.name)}
                </EuiButton>
              </div>
            ) : (
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type={ICONS.check} color="success" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued" data-test-subj="investigationTicketUpToDate">
                    {i18n.UP_TO_DATE(connector.name)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiSwitch
              compressed
              label={i18n.AUTO_PUSH}
              checked={ticket.auto_push}
              disabled={!pushed || !canUpdate || isSwitching}
              onChange={(event) => setAutoPush({ auto_push: event.target.checked })}
              data-test-subj="investigationTicketAutoPush"
            />
            <EuiText
              size="xs"
              color="subdued"
              css={css`
                margin-block-start: ${euiTheme.size.xs};
              `}
            >
              {pushed ? i18n.AUTO_PUSH_HELP : i18n.AUTO_PUSH_AFTER_FIRST}
            </EuiText>
          </EuiFlexItem>

          {pushed ? (
            <>
              <EuiHorizontalRule margin="none" />
              <EuiFlexItem grow={false}>
                <div>
                  <EuiButton
                    size="s"
                    iconType={ICONS.refresh}
                    isLoading={isSyncing}
                    isDisabled={!canUpdate}
                    onClick={() => sync({ connectorName: connector.name })}
                    data-test-subj="investigationTicketSync"
                  >
                    {i18n.SYNC_FROM(connector.name)}
                  </EuiButton>
                </div>
                <EuiText
                  size="xs"
                  color="subdued"
                  css={css`
                    margin-block-start: ${euiTheme.size.xs};
                  `}
                >
                  {i18n.SYNC_HELP}
                </EuiText>
                {lastSync ? (
                  <EuiText
                    size="xs"
                    color="subdued"
                    css={css`
                      margin-block-start: ${euiTheme.size.xs};
                    `}
                    data-test-subj="investigationTicketLastSync"
                  >
                    {i18n.LAST_SYNC} <RelativeTime value={lastSync.at} />:{' '}
                    {lastSync.changes.length > 0
                      ? lastSync.changes.join(', ')
                      : i18n.LAST_SYNC_NOTHING}
                  </EuiText>
                ) : null}
              </EuiFlexItem>
            </>
          ) : null}
        </>
      ) : null}

      {!canUpdate ? (
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.READ_ONLY}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
TicketBody.displayName = 'TicketBody';

export interface ExternalTicketCardProps {
  record: InvestigationRecord;
}

/** The external incident of the record: connector, push, automatic push and sync. */
export const ExternalTicketCard: React.FC<ExternalTicketCardProps> = ({ record }) => {
  const { permissions } = useCasesContext();
  const { data, error, isLoading, isError, refetch } = useExternalTicket(record.id);

  return (
    <SideCard title={i18n.EXTERNAL_TICKET} data-test-subj="investigationExternalTicketCard">
      {isLoading ? (
        <EuiSkeletonText lines={3} aria-label={i18n.LOADING} />
      ) : isError || !data ? (
        <ErrorState title={i18n.LOAD_ERROR} error={error} onRetry={() => void refetch()} />
      ) : (
        <TicketBody
          recordId={record.id}
          ticket={data}
          canUpdate={permissions.update && !record.merged_into}
          canPush={permissions.push}
        />
      )}
    </SideCard>
  );
};
ExternalTicketCard.displayName = 'ExternalTicketCard';
