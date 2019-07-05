/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { BrowserFields } from '../../../../../containers/source';
import { Ecs } from '../../../../../graphql/types';
import { DraggableBadge } from '../../../../draggables';
import { OverflowField } from '../../../../tables/helpers';

import * as i18n from './translations';
import { NetflowRenderer } from '../netflow';
import { UserHostWorkingDir } from '../user_host_working_dir';
import { Details, TokensFlexItem } from '../helpers';
import { ProcessDraggableWithNonExistentProcess } from '../process_draggable';
import { Args } from '../args';
import { AuthSsh } from './auth_ssh';
import { Package } from './package';
import { Badge } from '../../../../page';

interface Props {
  args: string | null | undefined;
  contextId: string;
  hostName: string | null | undefined;
  id: string;
  message: string | null | undefined;
  outcome: string | null | undefined;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  processExecutable: string | null | undefined;
  processTitle: string | null | undefined;
  sshSignature: string | null | undefined;
  sshMethod: string | null | undefined;
  text: string | null | undefined;
  userName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

export const SystemGenericFileLine = pure<Props>(
  ({
    args,
    contextId,
    hostName,
    id,
    message,
    outcome,
    packageName,
    packageSummary,
    packageVersion,
    processExecutable,
    processName,
    processPid,
    processTitle,
    sshSignature,
    sshMethod,
    text,
    userName,
    workingDirectory,
  }) => (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          eventId={id}
          contextId={contextId}
          userName={userName}
          workingDirectory={workingDirectory}
          hostName={hostName}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <ProcessDraggableWithNonExistentProcess
            contextId={contextId}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        <Args eventId={id} args={args} contextId={contextId} processTitle={processTitle} />
        {outcome != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.WITH_RESULT}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={id}
            field="event.outcome"
            queryValue={outcome}
            value={outcome}
          />
        </TokensFlexItem>
        <AuthSsh
          contextId={contextId}
          eventId={id}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
        />
        <Package
          contextId={contextId}
          eventId={id}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
        />
      </EuiFlexGroup>
      {message != null && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
            <TokensFlexItem grow={false} component="span">
              <Badge iconType="editorComment" color="hollow">
                <OverflowField value={message} />
              </Badge>
            </TokensFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  )
);

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  contextId: string;
  text: string;
}

export const SystemGenericFileDetails = pure<GenericDetailsProps>(({ data, contextId, text }) => {
  const id = data._id;
  const message: string | null = data.message != null ? data.message[0] : null;
  const hostName: string | null | undefined = get('host.name[0]', data);
  const userName: string | null | undefined = get('user.name[0]', data);
  const outcome: string | null | undefined = get('event.outcome[0]', data);
  const packageName: string | null | undefined = get('system.audit.package.name[0]', data);
  const packageSummary: string | null | undefined = get('system.audit.package.summary[0]', data);
  const packageVersion: string | null | undefined = get('system.audit.package.version[0]', data);
  const processPid: number | null | undefined = get('process.pid[0]', data);
  const processName: string | null | undefined = get('process.name[0]', data);
  const sshSignature: string | null | undefined = get('system.auth.ssh.signature[0]', data);
  const sshMethod: string | null | undefined = get('system.auth.ssh.method[0]', data);
  const processExecutable: string | null | undefined = get('process.executable[0]', data);
  const processTitle: string | null | undefined = get('process.title[0]', data);
  const workingDirectory: string | null | undefined = get('process.working_directory[0]', data);
  const rawArgs: string[] | null | undefined = get('process.args', data);
  const args: string | null = rawArgs != null ? rawArgs.slice(1).join(' ') : null;

  return (
    <Details>
      <SystemGenericFileLine
        id={id}
        contextId={contextId}
        text={text}
        hostName={hostName}
        userName={userName}
        message={message}
        processTitle={processTitle}
        workingDirectory={workingDirectory}
        args={args}
        packageName={packageName}
        packageSummary={packageSummary}
        packageVersion={packageVersion}
        processName={processName}
        processPid={processPid}
        processExecutable={processExecutable}
        sshSignature={sshSignature}
        sshMethod={sshMethod}
        outcome={outcome}
      />
      <EuiSpacer size="s" />
      <NetflowRenderer data={data} />
    </Details>
  );
});
