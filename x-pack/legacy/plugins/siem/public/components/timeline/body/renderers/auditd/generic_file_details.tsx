/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer, IconType } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { BrowserFields } from '../../../../../containers/source';
import { Ecs } from '../../../../../graphql/types';
import { DraggableBadge } from '../../../../draggables';

import * as i18n from './translations';
import { NetflowRenderer } from '../netflow';
import { TokensFlexItem, Details } from '../helpers';
import { ProcessDraggable } from '../process_draggable';
import { Args } from '../args';
import { SessionUserHostWorkingDir } from './session_user_host_working_dir';

interface Props {
  id: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  result: string | null | undefined;
  primary: string | null | undefined;
  fileIcon: IconType;
  contextId: string;
  text: string;
  secondary: string | null | undefined;
  filePath: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  processExecutable: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string[] | null | undefined;
  session: string | null | undefined;
}

export const AuditdGenericFileLine = React.memo<Props>(
  ({
    id,
    contextId,
    hostName,
    userName,
    result,
    primary,
    secondary,
    filePath,
    processName,
    processPid,
    processExecutable,
    processTitle,
    workingDirectory,
    args,
    session,
    text,
    fileIcon,
  }) => (
    <EuiFlexGroup alignItems="center" gutterSize="none" justifyContent="center" wrap={true}>
      <SessionUserHostWorkingDir
        contextId={contextId}
        eventId={id}
        hostName={hostName}
        primary={primary}
        secondary={secondary}
        session={session}
        userName={userName}
        workingDirectory={workingDirectory}
      />
      {(filePath != null || processExecutable != null) && (
        <TokensFlexItem component="span" grow={false}>
          {text}
        </TokensFlexItem>
      )}
      <TokensFlexItem component="span" grow={false}>
        <DraggableBadge
          contextId={contextId}
          eventId={id}
          field="file.path"
          iconType={fileIcon}
          value={filePath}
        />
      </TokensFlexItem>
      {processExecutable != null && (
        <TokensFlexItem component="span" grow={false}>
          {i18n.USING}
        </TokensFlexItem>
      )}
      <TokensFlexItem component="span" grow={false}>
        <ProcessDraggable
          contextId={contextId}
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId={id}
          processExecutable={processExecutable}
          processName={processName}
          processPid={processPid}
        />
      </TokensFlexItem>
      <Args args={args} contextId={contextId} eventId={id} processTitle={processTitle} />
      {result != null && (
        <TokensFlexItem component="span" grow={false}>
          {i18n.WITH_RESULT}
        </TokensFlexItem>
      )}
      <TokensFlexItem component="span" grow={false}>
        <DraggableBadge
          contextId={contextId}
          eventId={id}
          field="auditd.result"
          queryValue={result}
          value={result}
        />
      </TokensFlexItem>
    </EuiFlexGroup>
  )
);

AuditdGenericFileLine.displayName = 'AuditdGenericFileLine';

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  contextId: string;
  text: string;
  fileIcon: IconType;
  timelineId: string;
}

export const AuditdGenericFileDetails = React.memo<GenericDetailsProps>(
  ({ data, contextId, text, fileIcon = 'document', timelineId }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session[0]', data);
    const hostName: string | null | undefined = get('host.name[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const result: string | null | undefined = get('auditd.result[0]', data);
    const processPid: number | null | undefined = get('process.pid[0]', data);
    const processName: string | null | undefined = get('process.name[0]', data);
    const processExecutable: string | null | undefined = get('process.executable[0]', data);
    const processTitle: string | null | undefined = get('process.title[0]', data);
    const workingDirectory: string | null | undefined = get('process.working_directory[0]', data);
    const filePath: string | null | undefined = get('file.path[0]', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary[0]', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary[0]', data);
    const args: string[] | null | undefined = get('process.args', data);

    if (data.process != null) {
      return (
        <Details>
          <AuditdGenericFileLine
            args={args}
            contextId={contextId}
            fileIcon={fileIcon}
            filePath={filePath}
            hostName={hostName}
            id={id}
            primary={primary}
            processExecutable={processExecutable}
            processName={processName}
            processPid={processPid}
            processTitle={processTitle}
            result={result}
            secondary={secondary}
            session={session}
            text={text}
            userName={userName}
            workingDirectory={workingDirectory}
          />
          <EuiSpacer size="s" />
          <NetflowRenderer data={data} timelineId={timelineId} />
        </Details>
      );
    } else {
      return null;
    }
  }
);

AuditdGenericFileDetails.displayName = 'AuditdGenericFileDetails';
