/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import * as i18n from './translations';

/**
 * One collapsible region of the activity column — the description, or the feed as a whole. Each
 * reports whether it has anything to collapse and whether it is currently fully collapsed or fully
 * expanded, so the shared control can aggregate across all of them.
 */
export interface ActivityCollapseParticipant {
  canCollapse: boolean;
  allCollapsed: boolean;
  allExpanded: boolean;
  collapseAll: () => void;
  expandAll: () => void;
}

interface ActivityCollapseContextValue {
  participants: Record<string, ActivityCollapseParticipant>;
  setParticipant: (id: string, participant: ActivityCollapseParticipant | undefined) => void;
}

const ActivityCollapseContext = createContext<ActivityCollapseContextValue | undefined>(undefined);

/**
 * Lets the activity feed publish its collapse-all/expand-all controls so they can be rendered
 * directly beneath the filter row, where the attachments tab puts the same pair — rather than at the
 * top of the feed itself, which put the same gesture in two different places depending on the tab.
 * The feed owns the state (it is the only thing that knows which activities are collapsible), so it
 * registers the handlers here instead of the state being lifted out of it.
 */
export const ActivityCollapseProvider: FC<PropsWithChildren> = ({ children }) => {
  const [participants, setParticipants] = useState<Record<string, ActivityCollapseParticipant>>({});

  const setParticipant = useCallback(
    (id: string, participant: ActivityCollapseParticipant | undefined) => {
      setParticipants((previous) => {
        if (!participant) {
          if (!(id in previous)) return previous;
          const { [id]: _removed, ...rest } = previous;
          return rest;
        }
        return { ...previous, [id]: participant };
      });
    },
    []
  );

  const value = useMemo(() => ({ participants, setParticipant }), [participants, setParticipant]);

  return (
    <ActivityCollapseContext.Provider value={value}>{children}</ActivityCollapseContext.Provider>
  );
};

ActivityCollapseProvider.displayName = 'ActivityCollapseProvider';

/** Joins a region to the shared control. A no-op outside the provider, so the legacy view is unaffected. */
export const useRegisterActivityCollapseControls = (
  id: string,
  participant: ActivityCollapseParticipant
) => {
  const { setParticipant } = useContext(ActivityCollapseContext) ?? {};
  const { canCollapse, allCollapsed, allExpanded, collapseAll, expandAll } = participant;

  useEffect(() => {
    if (!setParticipant) {
      return;
    }

    setParticipant(id, { canCollapse, allCollapsed, allExpanded, collapseAll, expandAll });

    return () => setParticipant(id, undefined);
  }, [setParticipant, id, canCollapse, allCollapsed, allExpanded, collapseAll, expandAll]);
};

/**
 * Explains a disabled control on hover. A disabled EuiButtonEmpty does not fire pointer events, so
 * the tooltip has to wrap it from the outside to be reachable at all.
 */
const DisabledReason: FC<PropsWithChildren<{ show: boolean }>> = ({ show, children }) =>
  show ? (
    <EuiToolTip content={i18n.NOTHING_TO_COLLAPSE} display="inlineBlock">
      {/* Focusable so the explanation is reachable by keyboard: a disabled button is not. */}
      <span tabIndex={0}>{children}</span>
    </EuiToolTip>
  ) : (
    <>{children}</>
  );

DisabledReason.displayName = 'DisabledReason';

/**
 * The feed's collapse-all/expand-all pair. Always rendered — disabled with an explanation when there
 * is nothing to collapse, rather than disappearing. A control that comes and goes depending on the
 * contents of the feed reads as instability; a disabled one that says why does not.
 */
export const ActivityCollapseControls: FC = () => {
  const participants = Object.values(useContext(ActivityCollapseContext)?.participants ?? {});
  const collapsible = participants.filter((participant) => participant.canCollapse);

  const canCollapse = collapsible.length > 0;
  // Enabled while any region is still expanded, and vice versa, so one control governs the whole
  // column rather than only the region that happens to disagree.
  const allCollapsed = canCollapse && collapsible.every((p) => p.allCollapsed);
  const allExpanded = canCollapse && collapsible.every((p) => p.allExpanded);
  const collapseAll = () => collapsible.forEach((p) => p.collapseAll());
  const expandAll = () => collapsible.forEach((p) => p.expandAll());

  return (
    /* Right-aligned and icon-led, matching the attachments tab's equivalent control so the same
       gesture looks the same, and sits in the same place, on both tabs. */
    <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
      <EuiFlexItem grow={false}>
        <DisabledReason show={!canCollapse}>
          <EuiButtonEmpty
            size="xs"
            iconType="fold"
            onClick={collapseAll}
            disabled={!canCollapse || allCollapsed}
            data-test-subj="case-user-actions-collapse-all"
          >
            {i18n.COLLAPSE_ALL_ACTIVITIES}
          </EuiButtonEmpty>
        </DisabledReason>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DisabledReason show={!canCollapse}>
          <EuiButtonEmpty
            size="xs"
            iconType="unfold"
            onClick={expandAll}
            disabled={!canCollapse || allExpanded}
            data-test-subj="case-user-actions-expand-all"
          >
            {i18n.EXPAND_ALL_ACTIVITIES}
          </EuiButtonEmpty>
        </DisabledReason>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

ActivityCollapseControls.displayName = 'ActivityCollapseControls';
