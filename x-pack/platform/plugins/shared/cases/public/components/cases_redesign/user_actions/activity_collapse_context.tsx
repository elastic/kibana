/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import * as i18n from './translations';

interface ActivityCollapseControls {
  canCollapse: boolean;
  allCollapsed: boolean;
  allExpanded: boolean;
  collapseAll: () => void;
  expandAll: () => void;
}

interface ActivityCollapseContextValue {
  controls: ActivityCollapseControls | undefined;
  setControls: (controls: ActivityCollapseControls | undefined) => void;
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
  const [controls, setControls] = useState<ActivityCollapseControls | undefined>();
  const value = useMemo(() => ({ controls, setControls }), [controls]);

  return (
    <ActivityCollapseContext.Provider value={value}>{children}</ActivityCollapseContext.Provider>
  );
};

ActivityCollapseProvider.displayName = 'ActivityCollapseProvider';

/** Publishes the feed's controls. A no-op outside the provider, so the legacy view is unaffected. */
export const useRegisterActivityCollapseControls = (controls: ActivityCollapseControls) => {
  const context = useContext(ActivityCollapseContext);
  const { setControls } = context ?? {};
  const { canCollapse, allCollapsed, allExpanded, collapseAll, expandAll } = controls;

  useEffect(() => {
    if (!setControls) {
      return;
    }

    setControls({ canCollapse, allCollapsed, allExpanded, collapseAll, expandAll });

    return () => setControls(undefined);
  }, [setControls, canCollapse, allCollapsed, allExpanded, collapseAll, expandAll]);
};

/** Renders the feed's collapse-all/expand-all pair, or nothing when there is nothing to collapse. */
export const ActivityCollapseControls: FC = () => {
  const controls = useContext(ActivityCollapseContext)?.controls;

  if (!controls?.canCollapse) {
    return null;
  }

  return (
    <>
      {/* Right-aligned and icon-led, matching the attachments tab's equivalent control so the same
          gesture looks the same, and sits in the same place, on both tabs. */}
      <EuiFlexGroup gutterSize="s" responsive={false} justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="fold"
            onClick={controls.collapseAll}
            disabled={controls.allCollapsed}
            data-test-subj="case-user-actions-collapse-all"
          >
            {i18n.COLLAPSE_ALL_ACTIVITIES}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="unfold"
            onClick={controls.expandAll}
            disabled={controls.allExpanded}
            data-test-subj="case-user-actions-expand-all"
          >
            {i18n.EXPAND_ALL_ACTIVITIES}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};

ActivityCollapseControls.displayName = 'ActivityCollapseControls';
