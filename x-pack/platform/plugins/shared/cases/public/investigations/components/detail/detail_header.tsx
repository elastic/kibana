/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPopover,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  Actor,
  InvestigationRecord,
  RecordCounters,
} from '../../../../common/investigations/types';
import { useInvestigationsNavigation, useRecord, useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import { ActorAvatar, ActorBadge } from '../shared/actor_badge';
import { formatAge } from '../shared/formatters';
import { PriorityBadge } from '../shared/priority_badge';
import { StatusBadge } from '../shared/status_badge';
import { VerdictBadge, getEffectiveVerdict } from '../shared/verdict_badge';
import * as sharedI18n from '../shared/translations';
import type { ModalName } from '../modals/modal_props';
import * as modalsI18n from '../modals/translations';
import * as i18n from './translations';

const MAX_VISIBLE_PARTICIPANTS = 5;

export interface ScopeSummary {
  text: string;
  suspected: string | null;
}

/**
 * Hosts and identities in scope, from the record counters. Suspected entities are counted apart,
 * taken from hosts first.
 */
export const getScopeSummary = (counters: RecordCounters): ScopeSummary => {
  const suspected = counters.entities_suspected;
  const totalHosts = counters.entities_by_type.host ?? 0;
  const totalIdentities =
    (counters.entities_by_type.user ?? 0) + (counters.entities_by_type.nhi ?? 0);
  const suspectedHosts = Math.min(suspected, totalHosts);
  const hosts = totalHosts - suspectedHosts;
  const identities = Math.max(0, totalIdentities - (suspected - suspectedHosts));

  const parts: string[] = [];
  if (hosts > 0) parts.push(i18n.HOSTS(hosts));
  if (identities > 0) parts.push(i18n.IDENTITIES(identities));

  return {
    text: parts.length > 0 ? parts.join(', ') : i18n.NOTHING_IN_SCOPE,
    suspected: suspected > 0 ? i18n.SUSPECTED(suspected) : null,
  };
};

const getParticipants = (record: InvestigationRecord): Actor[] => {
  const seen = new Set<string>();
  const all: Actor[] = [];
  [...record.participants, ...(record.owner ? [record.owner] : [])].forEach((actor) => {
    const key = `${actor.type}:${actor.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      all.push(actor);
    }
  });
  return all;
};

const MetaItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
MetaItem.displayName = 'MetaItem';

const ParticipantsStack: React.FC<{ actors: Actor[] }> = ({ actors }) => {
  const { euiTheme } = useEuiTheme();
  const visible = actors.slice(0, MAX_VISIBLE_PARTICIPANTS);
  const hidden = actors.length - visible.length;

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {visible.map((actor, index) => (
        <EuiFlexItem
          key={`${actor.type}:${actor.id}`}
          grow={false}
          css={css`
            margin-inline-start: ${index === 0 ? 0 : `-${euiTheme.size.xs}`};
            border-radius: 50%;
            box-shadow: 0 0 0 ${euiTheme.border.width.thick} ${euiTheme.colors.emptyShade};
          `}
        >
          <ActorAvatar actor={actor} />
        </EuiFlexItem>
      ))}
      {hidden > 0 ? (
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              margin-inline-start: ${euiTheme.size.xs};
            `}
          >
            {i18n.PARTICIPANTS_MORE(hidden)}
          </EuiText>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
ParticipantsStack.displayName = 'ParticipantsStack';

/** Shown on a record that was merged away: points to the primary investigation. */
const MergedIntoCallout: React.FC<{ primaryId: string }> = ({ primaryId }) => {
  const { getRecordPath, getHref, goToRecord } = useInvestigationsNavigation();
  const { data } = useRecord(primaryId);
  const displayId = data?.record.display_id;

  return (
    <EuiCallOut
      size="s"
      color="warning"
      iconType={ICONS.merge}
      title={
        <EuiLink
          href={getHref(getRecordPath(primaryId))}
          onClick={(event: React.MouseEvent) => {
            event.preventDefault();
            goToRecord(primaryId);
          }}
          data-test-subj="investigationMergedIntoLink"
        >
          {displayId
            ? modalsI18n.HEADER_MERGED_INTO(displayId)
            : modalsI18n.HEADER_MERGED_INTO_UNKNOWN}
        </EuiLink>
      }
      data-test-subj="investigationMergedIntoCallout"
    >
      {modalsI18n.HEADER_MERGED_BODY}
    </EuiCallOut>
  );
};
MergedIntoCallout.displayName = 'MergedIntoCallout';

/** A lock badge with the people who may open the record. Click it to change the restriction. */
const RestrictedBadge: React.FC<{ usernames: string[]; onClick: () => void }> = ({
  usernames,
  onClick,
}) => (
  <EuiToolTip
    title={modalsI18n.HEADER_RESTRICTED_TOOLTIP_TITLE}
    content={
      <ul data-test-subj="investigationRestrictedPeople">
        {usernames.map((username) => (
          <li key={username}>{username}</li>
        ))}
      </ul>
    }
  >
    <EuiBadge
      color="hollow"
      iconType={ICONS.restricted}
      onClick={onClick}
      onClickAriaLabel={modalsI18n.HEADER_RESTRICTED_BADGE_ARIA(usernames.join(', '))}
      data-test-subj="investigationRestrictedBadge"
    >
      {modalsI18n.HEADER_RESTRICTED_BADGE}
    </EuiBadge>
  </EuiToolTip>
);
RestrictedBadge.displayName = 'RestrictedBadge';

interface ActionPanelsOptions {
  hasDetermination: boolean;
  isClosed: boolean;
  isMerged: boolean;
  openModal: (name: ModalName) => void;
  closeMenu: () => void;
}

/**
 * The Take action menu. Memoized so a record refresh while the menu is open does not rebuild the
 * menu items under the user's pointer.
 */
const useActionPanels = ({
  hasDetermination,
  isClosed,
  isMerged,
  openModal,
  closeMenu,
}: ActionPanelsOptions): EuiContextMenuPanelDescriptor[] =>
  useMemo(() => {
    const choose = (name: ModalName) => () => {
      closeMenu();
      openModal(name);
    };

    return [
      {
        id: 0,
        title: i18n.ACTIONS_MENU_TITLE,
        items: [
          {
            name: hasDetermination ? i18n.EDIT_DETERMINATION : i18n.SET_DETERMINATION,
            icon: ICONS.verdict,
            onClick: choose('determination'),
            'data-test-subj': 'investigationActionDetermination',
          },
          {
            name: i18n.GENERATE_REPORT,
            icon: ICONS.report,
            onClick: choose('report'),
            'data-test-subj': 'investigationActionReport',
          },
          {
            name: i18n.CHANGE_HISTORY,
            icon: ICONS.history,
            onClick: choose('history'),
            'data-test-subj': 'investigationActionHistory',
          },
          {
            name: i18n.MERGE,
            icon: ICONS.merge,
            onClick: choose('merge'),
            disabled: isMerged,
            'data-test-subj': 'investigationActionMerge',
          },
          {
            name: modalsI18n.HEADER_RESTRICT_ACCESS,
            icon: ICONS.restricted,
            onClick: choose('restrict'),
            'data-test-subj': 'investigationActionRestrict',
          },
          ...(isMerged
            ? []
            : [
                isClosed
                  ? {
                      name: i18n.REOPEN_INVESTIGATION,
                      icon: ICONS.refresh,
                      onClick: choose('reopen'),
                      'data-test-subj': 'investigationActionReopen',
                    }
                  : {
                      name: i18n.CLOSE_INVESTIGATION,
                      icon: ICONS.check,
                      onClick: choose('close'),
                      'data-test-subj': 'investigationActionClose',
                    },
              ]),
        ],
      },
    ];
  }, [hasDetermination, isClosed, isMerged, openModal, closeMenu]);

export interface DetailHeaderProps {
  record: InvestigationRecord;
  openModal: (name: ModalName) => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({ record, openModal }) => {
  const { euiTheme } = useEuiTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { mutate: updateRecord, isLoading: isTakingOwnership } = useUpdateRecord(record.id, {
    successMessage: i18n.TAKE_OWNERSHIP_SUCCESS,
  });

  const isClosed = record.status === 'closed';
  const isMerged = Boolean(record.merged_into);
  const isRestricted = record.restricted_to.length > 0;
  const verdict = getEffectiveVerdict(record);
  const scope = getScopeSummary(record.counters);
  const flag = record.fields.flag_keyword;
  const originIcon =
    record.origin.type === 'agent' || record.origin.type === 'automation'
      ? ICONS.agent
      : record.origin.type === 'rule'
      ? ICONS.rule
      : ICONS.user;

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const panels = useActionPanels({
    hasDetermination: Boolean(record.analyst_verdict),
    isClosed,
    isMerged,
    openModal,
    closeMenu,
  });

  return (
    <header
      css={css`
        flex: 0 0 auto;
        padding-block: ${euiTheme.size.m};
      `}
      data-test-subj="investigationHeader"
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexStart"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiTitle size="m">
            <h1
              css={css`
                overflow-wrap: anywhere;
              `}
              data-test-subj="investigationTitle"
            >
              {record.title}
            </h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            aria-label={i18n.TAKE_ACTION}
            isOpen={isMenuOpen}
            closePopover={() => setIsMenuOpen(false)}
            panelPaddingSize="none"
            anchorPosition="downRight"
            button={
              <EuiButton
                color="text"
                iconType={ICONS.chevronDown}
                iconSide="right"
                onClick={() => setIsMenuOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isMenuOpen}
                data-test-subj="investigationTakeAction"
              >
                {i18n.TAKE_ACTION}
              </EuiButton>
            }
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>

      {record.merged_into ? (
        <div
          css={css`
            margin-block-start: ${euiTheme.size.s};
          `}
        >
          <MergedIntoCallout primaryId={record.merged_into} />
        </div>
      ) : null}

      <EuiFlexGroup
        wrap
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={css`
          margin-block-start: ${euiTheme.size.s};
        `}
        data-test-subj="investigationMeta"
      >
        <EuiFlexItem grow={false}>
          <StatusBadge status={record.status} owner={record.owner} />
        </EuiFlexItem>
        {typeof flag === 'string' && flag.length > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning" data-test-subj="investigationFlagBadge">
              {flag}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        {isRestricted ? (
          <EuiFlexItem grow={false}>
            <RestrictedBadge
              usernames={record.restricted_to}
              onClick={() => openModal('restrict')}
            />
          </EuiFlexItem>
        ) : null}
        <MetaItem label={i18n.OWNER}>
          {record.owner ? (
            <ActorBadge actor={record.owner} compact />
          ) : (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color={euiTheme.colors.textWarning}>
                  <strong>{i18n.UNASSIGNED}</strong>
                </EuiText>
              </EuiFlexItem>
              {isClosed ? null : (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    size="s"
                    fill
                    isLoading={isTakingOwnership}
                    onClick={() => updateRecord({ owner: { self: true } })}
                    data-test-subj="investigationTakeOwnership"
                  >
                    {i18n.TAKE_OWNERSHIP}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
        </MetaItem>
        <MetaItem label={i18n.VERDICT}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <VerdictBadge
                label={verdict.label}
                verdict={verdict.classification}
                source={verdict.source}
              />
            </EuiFlexItem>
            {verdict.source ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {verdict.source === 'analyst'
                    ? sharedI18n.VERDICT_SOURCE_ANALYST
                    : sharedI18n.VERDICT_SOURCE_AGENT}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </MetaItem>
        <MetaItem label={i18n.PRIORITY}>
          <PriorityBadge priority={record.priority} note={record.priority_note} />
        </MetaItem>
        <MetaItem label={i18n.PARTICIPANTS}>
          <ParticipantsStack actors={getParticipants(record)} />
        </MetaItem>
        <MetaItem label={i18n.AGE}>
          <EuiText size="s">
            <strong>{formatAge(record.created_at, record.closed_at)}</strong>
          </EuiText>
        </MetaItem>
        <MetaItem label={i18n.SCOPE}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{scope.text}</strong>
              </EuiText>
            </EuiFlexItem>
            {scope.suspected ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color={euiTheme.colors.textWarning}>
                  {scope.suspected}
                </EuiText>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </MetaItem>
        <EuiFlexItem grow={false}>
          <EuiBadge
            color="hollow"
            iconType={originIcon}
            title={i18n.ORIGIN_LABEL}
            data-test-subj="investigationOriginChip"
          >
            {record.origin.label}
          </EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </header>
  );
};
DetailHeader.displayName = 'DetailHeader';
