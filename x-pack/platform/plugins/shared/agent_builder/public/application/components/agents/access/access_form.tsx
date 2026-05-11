/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { EuiSpacer, EuiText, EuiTitle, useEuiTheme, type EuiThemeComputed } from '@elastic/eui';
import { type AgentAclEntry, AgentAclRole, type AgentDefinition } from '@kbn/agent-builder-common';
import { selectableRolesForVisibility } from './role_to_capabilities';
import { PrincipalRow } from './principal_row';
import { UserPicker } from './user_picker';
import { RolePicker } from './role_picker';
import { useRoles } from '../../../hooks/use_roles';
import {
  accessFlyoutNoPeople,
  accessFlyoutNoRoles,
  accessFlyoutPeopleHelp,
  accessFlyoutPeopleSection,
  accessFlyoutRolesHelp,
  accessFlyoutRolesSection,
} from './access_i18n';

interface AccessFormProps {
  agent: AgentDefinition;
  entries: AgentAclEntry[];
  isDisabled?: boolean;
  onChange: (entries: AgentAclEntry[]) => void;
}

const partitionEntries = (entries: AgentAclEntry[]) => {
  const users: AgentAclEntry[] = [];
  const roles: AgentAclEntry[] = [];
  for (const entry of entries) {
    if (entry.type === 'user') users.push(entry);
    else if (entry.type === 'role') roles.push(entry);
  }
  return { users, roles };
};

const sectionStyles = (euiTheme: EuiThemeComputed) => css`
  padding-top: ${euiTheme.size.l};
`;

const sectionHeaderStyles = (euiTheme: EuiThemeComputed) => css`
  margin-bottom: ${euiTheme.size.s};
`;

const entriesContainerStyles = (euiTheme: EuiThemeComputed) => css`
  margin-top: ${euiTheme.size.m};
  /* Group of rows; each row has its own top divider so the group reads as a list. */
`;

const emptyStateStyles = (euiTheme: EuiThemeComputed) => css`
  margin-top: ${euiTheme.size.m};
  padding: ${euiTheme.size.m} 0;
`;

interface SectionProps {
  title: string;
  helpText: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, helpText, children }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div css={sectionStyles(euiTheme)}>
      <div css={sectionHeaderStyles(euiTheme)}>
        <EuiTitle size="xxs">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiText size="xs" color="subdued">
          {helpText}
        </EuiText>
      </div>
      {children}
    </div>
  );
};

export const AccessForm: React.FC<AccessFormProps> = ({ agent, entries, isDisabled, onChange }) => {
  const { euiTheme } = useEuiTheme();
  const visibility = agent.visibility;
  const { data: knownRoles } = useRoles();

  const { users, roles } = useMemo(() => partitionEntries(entries), [entries]);

  const knownRoleNames = useMemo(
    () => new Set((knownRoles ?? []).map((r) => r.name)),
    [knownRoles]
  );

  const defaultRole = useMemo(() => {
    const allowed = selectableRolesForVisibility(visibility);
    return allowed.includes(AgentAclRole.User) ? AgentAclRole.User : allowed[0];
  }, [visibility]);

  const handleAdd = (entry: AgentAclEntry) => {
    onChange([...entries, entry]);
  };

  const handleChangeRole = (target: AgentAclEntry, role: AgentAclRole) => {
    onChange(
      entries.map((e) => (e.type === target.type && e.name === target.name ? { ...e, role } : e))
    );
  };

  const handleRemove = (target: AgentAclEntry) => {
    onChange(entries.filter((e) => !(e.type === target.type && e.name === target.name)));
  };

  return (
    <>
      <Section title={accessFlyoutPeopleSection} helpText={accessFlyoutPeopleHelp}>
        <UserPicker
          excludedUsernames={users.map((u) => u.name)}
          isDisabled={isDisabled}
          onAdd={(username) => handleAdd({ type: 'user', name: username, role: defaultRole })}
        />
        {users.length === 0 ? (
          <EuiText size="xs" color="subdued" css={emptyStateStyles(euiTheme)}>
            {accessFlyoutNoPeople}
          </EuiText>
        ) : (
          <div css={entriesContainerStyles(euiTheme)}>
            {users.map((entry) => (
              <PrincipalRow
                key={`user:${entry.name}`}
                entry={entry}
                visibility={visibility}
                missing={false}
                isDisabled={isDisabled}
                onChangeRole={(role) => handleChangeRole(entry, role)}
                onRemove={() => handleRemove(entry)}
              />
            ))}
          </div>
        )}
      </Section>

      <EuiSpacer size="l" />

      <Section title={accessFlyoutRolesSection} helpText={accessFlyoutRolesHelp}>
        <RolePicker
          excludedRoles={roles.map((r) => r.name)}
          isDisabled={isDisabled}
          onAdd={(roleName) => handleAdd({ type: 'role', name: roleName, role: defaultRole })}
        />
        {roles.length === 0 ? (
          <EuiText size="xs" color="subdued" css={emptyStateStyles(euiTheme)}>
            {accessFlyoutNoRoles}
          </EuiText>
        ) : (
          <div css={entriesContainerStyles(euiTheme)}>
            {roles.map((entry) => (
              <PrincipalRow
                key={`role:${entry.name}`}
                entry={entry}
                visibility={visibility}
                missing={knownRoles != null && !knownRoleNames.has(entry.name)}
                isDisabled={isDisabled}
                onChangeRole={(role) => handleChangeRole(entry, role)}
                onRemove={() => handleRemove(entry)}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
};
