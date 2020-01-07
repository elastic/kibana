/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable react/display-name */

import { get } from 'lodash/fp';
import React from 'react';

import { DnsRequestEventDetails } from '../dns/dns_request_event_details';
import { EndgameSecurityEventDetails } from '../endgame/endgame_security_event_details';
import { isFileEvent, isNillEmptyOrNotFinite } from '../helpers';
import { RowRenderer, RowRendererContainer } from '../row_renderer';

import { SystemGenericDetails } from './generic_details';
import { SystemGenericFileDetails } from './generic_file_details';
import * as i18n from './translations';

export const createGenericSystemRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <SystemGenericDetails
          browserFields={browserFields}
          contextId={`${actionName}-${timelineId}`}
          data={data}
          text={text}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createEndgameProcessRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const category: string | null | undefined = get('event.category[0]', ecs);
    return (
      category != null &&
      category.toLowerCase() === 'process' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <SystemGenericFileDetails
          browserFields={browserFields}
          contextId={`endgame-process-${actionName}-${timelineId}`}
          data={data}
          showMessage={false}
          text={text}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createFimRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    const category: string | null | undefined = get('event.category[0]', ecs);
    const dataset: string | null | undefined = get('event.dataset[0]', ecs);
    return (
      isFileEvent({ eventCategory: category, eventDataset: dataset }) &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <SystemGenericFileDetails
          browserFields={browserFields}
          contextId={`fim-${actionName}-${timelineId}`}
          data={data}
          showMessage={false}
          text={text}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createGenericFileRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const module: string | null | undefined = get('event.module[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      module != null &&
      module.toLowerCase() === 'system' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <SystemGenericFileDetails
          browserFields={browserFields}
          contextId={`${actionName}-${timelineId}`}
          data={data}
          text={text}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createSocketRowRenderer = ({
  actionName,
  text,
}: {
  actionName: string;
  text: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const action: string | null | undefined = get('event.action[0]', ecs);
    return action != null && action.toLowerCase() === actionName;
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <SystemGenericFileDetails
          browserFields={browserFields}
          contextId={`socket-${actionName}-${timelineId}`}
          data={data}
          text={text}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createSecurityEventRowRenderer = ({
  actionName,
}: {
  actionName: string;
}): RowRenderer => ({
  isInstance: ecs => {
    const category: string | null | undefined = get('event.category[0]', ecs);
    const action: string | null | undefined = get('event.action[0]', ecs);
    return (
      category != null &&
      category.toLowerCase() === 'authentication' &&
      action != null &&
      action.toLowerCase() === actionName
    );
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <EndgameSecurityEventDetails
          browserFields={browserFields}
          contextId={`authentication-${actionName}-${timelineId}`}
          data={data}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

export const createDnsRowRenderer = (): RowRenderer => ({
  isInstance: ecs => {
    const dnsQuestionType: string | null | undefined = get('dns.question.type[0]', ecs);
    const dnsQuestionName: string | null | undefined = get('dns.question.name[0]', ecs);
    return !isNillEmptyOrNotFinite(dnsQuestionType) && !isNillEmptyOrNotFinite(dnsQuestionName);
  },
  renderRow: ({ browserFields, data, children, timelineId }) => (
    <>
      {children}
      <RowRendererContainer>
        <DnsRequestEventDetails
          browserFields={browserFields}
          contextId={`dns-request-${timelineId}`}
          data={data}
          timelineId={timelineId}
        />
      </RowRendererContainer>
    </>
  ),
});

const systemLoginRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_login',
  text: i18n.ATTEMPTED_LOGIN,
});

const systemProcessStartedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_started',
  text: i18n.PROCESS_STARTED,
});

const endgameProcessStartedRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'creation_event',
  text: i18n.PROCESS_STARTED,
});

const systemProcessStoppedRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_stopped',
  text: i18n.PROCESS_STOPPED,
});

const endgameProcessTerminationRowRenderer = createEndgameProcessRowRenderer({
  actionName: 'termination_event',
  text: i18n.TERMINATED_PROCESS,
});

const endgameFileCreateEventRowRenderer = createFimRowRenderer({
  actionName: 'file_create_event',
  text: i18n.CREATED_FILE,
});

const fimFileCreateEventRowRenderer = createFimRowRenderer({
  actionName: 'created',
  text: i18n.CREATED_FILE,
});

const endgameFileDeleteEventRowRenderer = createFimRowRenderer({
  actionName: 'file_delete_event',
  text: i18n.DELETED_FILE,
});

const fimFileDeletedEventRowRenderer = createFimRowRenderer({
  actionName: 'deleted',
  text: i18n.DELETED_FILE,
});

const systemExistingRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_process',
  text: i18n.EXISTING_PROCESS,
});

const systemSocketOpenedRowRenderer = createSocketRowRenderer({
  actionName: 'socket_opened',
  text: i18n.SOCKET_OPENED,
});

const systemSocketClosedRowRenderer = createSocketRowRenderer({
  actionName: 'socket_closed',
  text: i18n.SOCKET_CLOSED,
});

const endgameIpv4ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv4_connection_accept_event',
  text: i18n.ACCEPTED_A_CONNECTION_VIA,
});

const endgameIpv6ConnectionAcceptEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv6_connection_accept_event',
  text: i18n.ACCEPTED_A_CONNECTION_VIA,
});

const endgameIpv4DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv4_disconnect_received_event',
  text: i18n.DISCONNECTED_VIA,
});

const endgameIpv6DisconnectReceivedEventRowRenderer = createSocketRowRenderer({
  actionName: 'ipv6_disconnect_received_event',
  text: i18n.DISCONNECTED_VIA,
});

const endgameAdminLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'admin_logon',
});

const endgameExplicitUserLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'explicit_user_logon',
});

const endgameUserLogoffRowRenderer = createSecurityEventRowRenderer({
  actionName: 'user_logoff',
});

const endgameUserLogonRowRenderer = createSecurityEventRowRenderer({
  actionName: 'user_logon',
});

const dnsRowRenderer = createDnsRowRenderer();

const systemExistingUserRowRenderer = createGenericSystemRowRenderer({
  actionName: 'existing_user',
  text: i18n.EXISTING_USER,
});

const systemExistingSocketRowRenderer = createGenericFileRowRenderer({
  actionName: 'existing_socket',
  text: i18n.EXISTING_SOCKET,
});

const systemExistingPackageRowRenderer = createGenericSystemRowRenderer({
  actionName: 'existing_package',
  text: i18n.EXISTING_PACKAGE,
});

const systemInvalidRowRenderer = createGenericFileRowRenderer({
  actionName: 'invalid',
  text: i18n.INVALID,
});

const systemUserChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_changed',
  text: i18n.USER_CHANGED,
});

const systemHostChangedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'host',
  text: i18n.HOST_CHANGED,
});

const systemUserAddedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_added',
  text: i18n.USER_ADDED,
});

const systemLogoutRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_logout',
  text: i18n.LOGGED_OUT,
});

const systemProcessErrorRowRenderer = createGenericFileRowRenderer({
  actionName: 'process_error',
  text: i18n.PROCESS_ERROR,
});

// TODO: Remove this once this has been replaced everywhere with "error" below
const systemErrorRowRendererDeprecated = createGenericSystemRowRenderer({
  actionName: 'error:',
  text: i18n.ERROR,
});

const systemErrorRowRenderer = createGenericSystemRowRenderer({
  actionName: 'error',
  text: i18n.ERROR,
});

const systemPackageInstalledRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_installed',
  text: i18n.PACKAGE_INSTALLED,
});

const systemBootRowRenderer = createGenericSystemRowRenderer({
  actionName: 'boot',
  text: i18n.BOOT,
});

const systemAcceptedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'accepted',
  text: i18n.ACCEPTED,
});

const systemPackageUpdatedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_updated',
  text: i18n.PACKAGE_UPDATED,
});

const systemPackageRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'package_removed',
  text: i18n.PACKAGE_REMOVED,
});

const systemUserRemovedRowRenderer = createGenericSystemRowRenderer({
  actionName: 'user_removed',
  text: i18n.USER_REMOVED,
});

export const systemRowRenderers: RowRenderer[] = [
  dnsRowRenderer,
  endgameAdminLogonRowRenderer,
  endgameExplicitUserLogonRowRenderer,
  endgameFileCreateEventRowRenderer,
  endgameFileDeleteEventRowRenderer,
  endgameIpv4ConnectionAcceptEventRowRenderer,
  endgameIpv6ConnectionAcceptEventRowRenderer,
  endgameIpv4DisconnectReceivedEventRowRenderer,
  endgameIpv6DisconnectReceivedEventRowRenderer,
  endgameProcessStartedRowRenderer,
  endgameProcessTerminationRowRenderer,
  endgameUserLogoffRowRenderer,
  endgameUserLogonRowRenderer,
  fimFileCreateEventRowRenderer,
  fimFileDeletedEventRowRenderer,
  systemAcceptedRowRenderer,
  systemBootRowRenderer,
  systemErrorRowRenderer,
  systemErrorRowRendererDeprecated,
  systemExistingPackageRowRenderer,
  systemExistingRowRenderer,
  systemExistingSocketRowRenderer,
  systemExistingUserRowRenderer,
  systemHostChangedRowRenderer,
  systemInvalidRowRenderer,
  systemLoginRowRenderer,
  systemLogoutRowRenderer,
  systemPackageInstalledRowRenderer,
  systemPackageUpdatedRowRenderer,
  systemPackageRemovedRowRenderer,
  systemProcessErrorRowRenderer,
  systemProcessStartedRowRenderer,
  systemProcessStoppedRowRenderer,
  systemSocketClosedRowRenderer,
  systemSocketOpenedRowRenderer,
  systemUserAddedRowRenderer,
  systemUserChangedRowRenderer,
  systemUserRemovedRowRenderer,
];
