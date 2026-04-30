/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import {
  type AgentAclEntry,
  AgentAclRole,
  type AgentVisibility,
} from '@kbn/agent-builder-common';
import { selectableRolesForVisibility } from './role_to_capabilities';
import { PrincipalRow } from './principal_row';
import { UserPicker } from './user_picker';
import { RolePicker } from './role_picker';
import { useSuggestUsers } from '../../../hooks/use_suggest_users';
import { useRoles } from '../../../hooks/use_roles';
import {
  accessFlyoutContextCallout,
  accessFlyoutNoPeople,
  accessFlyoutNoRoles,
  accessFlyoutPeopleSection,
  accessFlyoutRolesSection,
  accessFlyoutVisibilityLabel,
} from './access_i18n';

interface AccessFormProps {
  visibility?: AgentVisibility;
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

export const AccessForm: React.FC<AccessFormProps> = ({
  visibility,
  entries,
  isDisabled,
  onChange,
}) => {
  const { data: knownUsers } = useSuggestUsers();
  const { data: knownRoles } = useRoles();

  const { users, roles } = useMemo(() => partitionEntries(entries), [entries]);

  const knownUsernames = useMemo(
    () => new Set((knownUsers ?? []).map((u) => u.username)),
    [knownUsers]
  );
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
      entries.map((e) =>
        e.type === target.type && e.name === target.name ? { ...e, role } : e
      )
    );
  };

  const handleRemove = (target: AgentAclEntry) => {
    onChange(entries.filter((e) => !(e.type === target.type && e.name === target.name)));
  };

  return (
    <>
      <EuiCallOut size="s" iconType="iInCircle" data-test-subj="agentBuilderAclContextCallout">
        <EuiText size="s">{accessFlyoutContextCallout}</EuiText>
        {visibility ? (
          <EuiText size="xs" color="subdued">
            {accessFlyoutVisibilityLabel(visibility)}
          </EuiText>
        ) : null}
      </EuiCallOut>
      <EuiSpacer size="m" />

      <EuiTitle size="xs">
        <h3>{accessFlyoutPeopleSection}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <UserPicker
        excludedUsernames={users.map((u) => u.name)}
        isDisabled={isDisabled}
        onAdd={(username) =>
          handleAdd({ type: 'user', name: username, role: defaultRole })
        }
      />
      <EuiSpacer size="s" />
      {users.length === 0 ? (
        <EuiText size="s" color="subdued">
          {accessFlyoutNoPeople}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {users.map((entry) => (
            <EuiFlexItem grow={false} key={`user:${entry.name}`}>
              <PrincipalRow
                entry={entry}
                visibility={visibility}
                missing={knownUsers != null && !knownUsernames.has(entry.name)}
                isDisabled={isDisabled}
                onChangeRole={(role) => handleChangeRole(entry, role)}
                onRemove={() => handleRemove(entry)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}

      <EuiHorizontalRule margin="l" />

      <EuiTitle size="xs">
        <h3>{accessFlyoutRolesSection}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <RolePicker
        excludedRoles={roles.map((r) => r.name)}
        isDisabled={isDisabled}
        onAdd={(roleName) =>
          handleAdd({ type: 'role', name: roleName, role: defaultRole })
        }
      />
      <EuiSpacer size="s" />
      {roles.length === 0 ? (
        <EuiText size="s" color="subdued">
          {accessFlyoutNoRoles}
        </EuiText>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          {roles.map((entry) => (
            <EuiFlexItem grow={false} key={`role:${entry.name}`}>
              <PrincipalRow
                entry={entry}
                visibility={visibility}
                missing={knownRoles != null && !knownRoleNames.has(entry.name)}
                isDisabled={isDisabled}
                onChangeRole={(role) => handleChangeRole(entry, role)}
                onRemove={() => handleRemove(entry)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      )}
    </>
  );
};
