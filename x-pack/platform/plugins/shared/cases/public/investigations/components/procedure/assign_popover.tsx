/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord, TaskItem } from '../../../../common/investigations/types';
import { ICONS, TASK_OWNER_ICONS } from '../../icons';
import {
  AUTOMATION_OWNER,
  MAX_NAME_LENGTH,
  UNASSIGNED_OWNER,
  getAgentOwner,
  isTaskUnassigned,
  personOwner,
} from './procedure_helpers';
import type { CurrentUser } from './procedure_helpers';
import * as i18n from './translations';

type Owner = TaskItem['task']['owner'];

export interface AssignPopoverProps {
  task: TaskItem;
  record: InvestigationRecord;
  currentUser: CurrentUser | undefined;
  isDisabled: boolean;
  onAssign: (task: TaskItem, owner: Owner) => void;
}

const NameForm: React.FC<{
  label: string;
  placeholder: string;
  testSubj: string;
  onSubmit: (name: string) => void;
}> = ({ label, placeholder, testSubj, onSubmit }) => {
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const trimmed = name.trim();
  const error =
    trimmed.length === 0
      ? i18n.ASSIGN_NAME_REQUIRED
      : trimmed.length > MAX_NAME_LENGTH
      ? i18n.ASSIGN_NAME_TOO_LONG
      : null;
  const submit = () => {
    setSubmitted(true);
    if (!error) {
      onSubmit(trimmed);
    }
  };

  return (
    <EuiFormRow
      label={label}
      display="rowCompressed"
      isInvalid={submitted && error !== null}
      error={error ?? undefined}
      fullWidth
    >
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiFieldText
            compressed
            fullWidth
            placeholder={placeholder}
            value={name}
            isInvalid={submitted && error !== null}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
            data-test-subj={`${testSubj}Input`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" onClick={submit} data-test-subj={`${testSubj}Submit`}>
            {i18n.ASSIGN_SUBMIT}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};

NameForm.displayName = 'NameForm';

export const AssignPopover: React.FC<AssignPopoverProps> = ({
  task,
  record,
  currentUser,
  isDisabled,
  onAssign,
}) => {
  const { euiTheme } = useEuiTheme();
  const popoverId = useGeneratedHtmlId();
  const [isOpen, setIsOpen] = useState(false);
  const agentOwner = getAgentOwner(record);
  const teammates = record.participants.filter(
    (participant) => participant.type === 'user' && participant.id !== currentUser?.username
  );

  const choose = (owner: Owner) => {
    setIsOpen(false);
    onAssign(task, owner);
  };

  return (
    <EuiPopover
      id={popoverId}
      aria-label={i18n.ASSIGN_TO}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
      button={
        <EuiButtonEmpty
          size="s"
          iconType={ICONS.chevronDown}
          iconSide="right"
          isDisabled={isDisabled}
          onClick={() => setIsOpen((open) => !open)}
          aria-haspopup="true"
          aria-label={i18n.ASSIGN_ARIA(task.title)}
          data-test-subj={`investigationTaskAssign-${task.id}`}
        >
          {i18n.ASSIGN}
        </EuiButtonEmpty>
      }
    >
      <div
        css={css`
          width: 300px;
        `}
        data-test-subj="investigationAssignPopover"
      >
        <EuiContextMenuPanel
          title={i18n.ASSIGN_TO}
          items={[
            ...(currentUser
              ? [
                  <EuiContextMenuItem
                    key="me"
                    icon={TASK_OWNER_ICONS.person}
                    onClick={() => choose(personOwner(currentUser))}
                    data-test-subj="investigationAssignMe"
                  >
                    {i18n.ASSIGN_ME}
                  </EuiContextMenuItem>,
                ]
              : []),
            ...teammates.map((participant) => (
              <EuiContextMenuItem
                key={`participant-${participant.id}`}
                icon={TASK_OWNER_ICONS.person}
                onClick={() =>
                  choose({ type: 'person', id: participant.id, name: participant.name })
                }
                data-test-subj={`investigationAssignParticipant-${participant.id}`}
              >
                {participant.name}
              </EuiContextMenuItem>
            )),
            ...(agentOwner
              ? [
                  <EuiContextMenuItem
                    key="agent"
                    icon={TASK_OWNER_ICONS.agent}
                    onClick={() => choose(agentOwner)}
                    data-test-subj="investigationAssignAgent"
                  >
                    {i18n.ASSIGN_AGENT(agentOwner.name ?? '')}
                  </EuiContextMenuItem>,
                ]
              : []),
            <EuiContextMenuItem
              key="automation"
              icon={TASK_OWNER_ICONS.automation}
              onClick={() => choose(AUTOMATION_OWNER)}
              data-test-subj="investigationAssignAutomation"
            >
              {i18n.ASSIGN_AUTOMATION}
            </EuiContextMenuItem>,
          ]}
        />
        <EuiHorizontalRule margin="none" />
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          <NameForm
            label={i18n.ASSIGN_PERSON}
            placeholder={i18n.ASSIGN_PERSON_PLACEHOLDER}
            testSubj="investigationAssignPerson"
            onSubmit={(name) => choose({ type: 'person', id: name, name })}
          />
          <NameForm
            label={i18n.ASSIGN_TEAM}
            placeholder={i18n.ASSIGN_TEAM_PLACEHOLDER}
            testSubj="investigationAssignTeam"
            onSubmit={(name) => choose({ type: 'team', id: name, name })}
          />
        </div>
        {isTaskUnassigned(task) ? null : (
          <>
            <EuiHorizontalRule margin="none" />
            <EuiContextMenuPanel
              items={[
                <EuiContextMenuItem
                  key="unassign"
                  icon={ICONS.close}
                  onClick={() => choose(UNASSIGNED_OWNER)}
                  data-test-subj="investigationUnassign"
                >
                  {i18n.UNASSIGN}
                </EuiContextMenuItem>,
              ]}
            />
          </>
        )}
      </div>
    </EuiPopover>
  );
};
AssignPopover.displayName = 'AssignPopover';
