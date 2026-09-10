/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiBadge,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiThemeComputed,
} from '@elastic/eui';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  isLegacyAgentAccessControlEntry,
  type AgentAccessControlEntry,
  AgentAccessControlRole,
  type AgentDefinition,
  type LegacyAgentAccessControlEntry,
} from '@kbn/agent-builder-common';
import { selectableRolesForAccessControlMode } from './role_to_capabilities';
import { PrincipalRow } from './principal_row';
import { UserPicker } from './user_picker';
import {
  accessFlyoutLegacyEntriesBody,
  accessFlyoutLegacyEntriesTitle,
  accessFlyoutNoPeople,
  accessFlyoutPeopleHelp,
  accessFlyoutPeopleSection,
} from './access_i18n';

type AccessFormEntry = AgentAccessControlEntry | LegacyAgentAccessControlEntry;

interface AccessFormProps {
  agent: Pick<AgentDefinition, 'access_control'>;
  entries: AccessFormEntry[];
  /** Resolved user profiles for id-backed entries, keyed by profile uid. */
  profileByUid: Map<string, UserProfileWithAvatar>;
  ownerName?: string;
  isDisabled?: boolean;
  onChange: (entries: AccessFormEntry[]) => void;
}

const sectionStyles = (euiTheme: EuiThemeComputed) => css`
  padding-top: ${euiTheme.size.l};
`;

const sectionHeaderStyles = (euiTheme: EuiThemeComputed) => css`
  margin-bottom: ${euiTheme.size.s};
`;

const emptyStateStyles = (euiTheme: EuiThemeComputed) => css`
  margin-top: ${euiTheme.size.m};
  padding: ${euiTheme.size.m} 0;
`;

const ownerRowStyles = (euiTheme: EuiThemeComputed) => css`
  min-height: ${euiTheme.size.xxxl};
  display: flex;
  align-items: center;
  padding-block: 0;
  padding-inline: ${euiTheme.size.s};
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

const entryKey = (entry: AccessFormEntry): string =>
  isLegacyAgentAccessControlEntry(entry) ? `name:${entry.name}` : `id:${entry.id}`;

const sameEntry = (a: AccessFormEntry, b: AccessFormEntry): boolean => entryKey(a) === entryKey(b);

export const AccessForm: React.FC<AccessFormProps> = ({
  agent,
  entries,
  profileByUid,
  ownerName,
  isDisabled,
  onChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const accessControlMode = agent.access_control?.access_mode;

  const defaultRole = useMemo(() => {
    const allowed = selectableRolesForAccessControlMode(accessControlMode);
    return allowed.includes(AgentAccessControlRole.User) ? AgentAccessControlRole.User : allowed[0];
  }, [accessControlMode]);

  const hasLegacyEntries = entries.some(isLegacyAgentAccessControlEntry);

  const excludedUids = useMemo(() => {
    const uids = new Set<string>();
    for (const entry of entries) {
      if (!isLegacyAgentAccessControlEntry(entry)) {
        uids.add(entry.id);
      }
    }
    return Array.from(uids);
  }, [entries]);

  const handleAdd = (profile: UserProfileWithAvatar) => {
    const nextEntry: AgentAccessControlEntry = {
      type: 'user',
      id: profile.uid,
      role: defaultRole,
    };
    onChange([...entries, nextEntry]);
  };

  const handleChangeRole = (target: AccessFormEntry, role: AgentAccessControlRole) => {
    onChange(entries.map((e) => (sameEntry(e, target) ? ({ ...e, role } as AccessFormEntry) : e)));
  };

  const handleRemove = (target: AccessFormEntry) => {
    onChange(entries.filter((e) => !sameEntry(e, target)));
  };

  return (
    <Section title={accessFlyoutPeopleSection} helpText={accessFlyoutPeopleHelp}>
      <UserPicker excludedUids={excludedUids} isDisabled={isDisabled} onAdd={handleAdd} />
      {hasLegacyEntries ? (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            title={accessFlyoutLegacyEntriesTitle}
            data-test-subj="agentBuilderAclLegacyCallout"
          >
            <EuiText size="s">{accessFlyoutLegacyEntriesBody}</EuiText>
          </EuiCallOut>
        </>
      ) : null}
      {entries.length === 0 ? (
        <EuiText size="xs" color="subdued" css={emptyStateStyles(euiTheme)}>
          {accessFlyoutNoPeople}
        </EuiText>
      ) : (
        <>
          <EuiSpacer size="s" />
          <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="subdued">
            <EuiPanel paddingSize="none" hasBorder={true} hasShadow={false}>
              {ownerName && (
                <div css={ownerRowStyles(euiTheme)}>
                  <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiAvatar size="s" name={ownerName} />
                    </EuiFlexItem>
                    <EuiFlexItem grow>
                      <EuiText size="s">
                        <strong>{ownerName}</strong>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiBadge>Owner</EuiBadge>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </div>
              )}
              {entries.map((entry) => (
                <PrincipalRow
                  key={entryKey(entry)}
                  entry={entry}
                  profile={
                    isLegacyAgentAccessControlEntry(entry) ? undefined : profileByUid.get(entry.id)
                  }
                  accessControlMode={accessControlMode}
                  isDisabled={isDisabled}
                  onChangeRole={(role) => handleChangeRole(entry, role)}
                  onRemove={() => handleRemove(entry)}
                />
              ))}
            </EuiPanel>
          </EuiPanel>
        </>
      )}
    </Section>
  );
};
