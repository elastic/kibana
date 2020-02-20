/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import React from 'react';

import { DraggableBadge } from '../../../../draggables';
import { isNillEmptyOrNotFinite, TokensFlexItem } from '../helpers';
import { ProcessDraggableWithNonExistentProcess } from '../process_draggable';
import { UserHostWorkingDir } from '../user_host_working_dir';

import * as i18n from './translations';

interface Props {
  contextId: string;
  dnsQuestionName: string | null | undefined;
  dnsQuestionType: string | null | undefined;
  dnsResolvedIp: string | null | undefined;
  dnsResponseCode: string | null | undefined;
  eventCode: string | null | undefined;
  hostName: string | null | undefined;
  id: string;
  processExecutable: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  userDomain: string | null | undefined;
  userName: string | null | undefined;
  winlogEventId: string | null | undefined;
}

export const DnsRequestEventDetailsLine = React.memo<Props>(
  ({
    contextId,
    dnsQuestionName,
    dnsQuestionType,
    dnsResolvedIp,
    dnsResponseCode,
    eventCode,
    hostName,
    id,
    processExecutable,
    processName,
    processPid,
    userDomain,
    userName,
    winlogEventId,
  }) => {
    return (
      <>
        <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
          <UserHostWorkingDir
            contextId={contextId}
            eventId={id}
            hostName={hostName}
            userDomain={userDomain}
            userName={userName}
            workingDirectory={undefined}
          />

          {!isNillEmptyOrNotFinite(dnsQuestionName) && (
            <>
              <TokensFlexItem component="span" data-test-subj="asked-for" grow={false}>
                {i18n.ASKED_FOR}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="dns.question.name"
                  value={dnsQuestionName}
                />
              </TokensFlexItem>
            </>
          )}

          {!isNillEmptyOrNotFinite(dnsQuestionType) && (
            <>
              <TokensFlexItem component="span" data-test-subj="with-question-type" grow={false}>
                {i18n.WITH_QUESTION_TYPE}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="dns.question.type"
                  value={dnsQuestionType}
                />
              </TokensFlexItem>
            </>
          )}

          {!isNillEmptyOrNotFinite(dnsResolvedIp) && (
            <>
              <TokensFlexItem component="span" data-test-subj="which-resolved-to" grow={false}>
                {i18n.WHICH_RESOLVED_TO}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="dns.resolved_ip"
                  value={dnsResolvedIp}
                />
              </TokensFlexItem>
            </>
          )}

          {!isNillEmptyOrNotFinite(dnsResponseCode) && (
            <>
              <TokensFlexItem component="span" grow={false}>
                {'('}
              </TokensFlexItem>
              <TokensFlexItem component="span" data-test-subj="response-code" grow={false}>
                {i18n.RESPONSE_CODE}
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                <DraggableBadge
                  contextId={contextId}
                  eventId={id}
                  field="dns.response_code"
                  value={dnsResponseCode}
                />
              </TokensFlexItem>
              <TokensFlexItem component="span" grow={false}>
                {')'}
              </TokensFlexItem>
            </>
          )}

          <TokensFlexItem component="span" grow={false}>
            {i18n.VIA}
          </TokensFlexItem>

          <TokensFlexItem component="span" grow={false}>
            <ProcessDraggableWithNonExistentProcess
              contextId={contextId}
              endgamePid={undefined}
              endgameProcessName={undefined}
              eventId={id}
              processPid={processPid}
              processName={processName}
              processExecutable={processExecutable}
            />
          </TokensFlexItem>

          {(!isNillEmptyOrNotFinite(eventCode) || !isNillEmptyOrNotFinite(winlogEventId)) && (
            <>
              {!isNillEmptyOrNotFinite(eventCode) ? (
                <TokensFlexItem component="span" grow={false}>
                  <DraggableBadge
                    contextId={contextId}
                    eventId={id}
                    field="event.code"
                    value={eventCode}
                  />
                </TokensFlexItem>
              ) : (
                <TokensFlexItem component="span" grow={false}>
                  <DraggableBadge
                    contextId={contextId}
                    eventId={id}
                    iconType="logoWindows"
                    field="winlog.event_id"
                    value={winlogEventId}
                  />
                </TokensFlexItem>
              )}
            </>
          )}
        </EuiFlexGroup>
      </>
    );
  }
);

DnsRequestEventDetailsLine.displayName = 'DnsRequestEventDetailsLine';
