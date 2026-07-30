/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Super-short-term lab: header + footer for the Infrastructure side panel (the
 * flyout), injected via the chrome side nav's `sidePanelHeader` /
 * `sidePanelFooter` extension slots (see `__kbnSideNavPanelHeader__` /
 * `__kbnSideNavPanelFooter__` in `@kbn/core-chrome-browser-components`).
 *
 * Rendered from streams_app (rather than Observability) so it can reuse the real
 * favorites/search store + the `ManageGroupsModal` without duplicating them. Both
 * slots only emit content for the Infrastructure panel while the super-short-term
 * lab mode is active; every other panel/mode gets `null`.
 *
 * Layout:
 *   - Header (top): a search box filtering both the starred and installed
 *     integration lists.
 *   - Section action: a "Manage groups" cog on the "Starred integrations"
 *     section header, injected via the `getSectionAction`
 *     (`__kbnSideNavSectionAction__`) slot and shown once grouped favorites are
 *     enabled.
 *   - Footer (bottom): the "Group starred integrations" toggle.
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiHorizontalRule,
  EuiListGroup,
  EuiListGroupItem,
  EuiSwitch,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import {
  setNestedNavEnabled,
  useNestedNavEnabled,
  setIntegrationsSearch,
  useIntegrationsSearch,
} from '@kbn/entity-centric-lab-flyout';
import { ManageGroupsModal } from './favorites_group_modals';

const LAB_MODE_SETTING = 'discover:labMode';
const SUPER_SHORT_TERM = 'superShortTerm';
// The Infrastructure panel-opener node id set in the Observability nav tree.
const INFRASTRUCTURE_PANEL_ID = 'entities';
// The "Starred integrations" section id set in the Observability nav tree.
const STARRED_SECTION_ID = 'entityCentricLab-starredIntegrations';
const SIDE_PANEL_FOOTER_GLOBAL_KEY = '__kbnSideNavPanelFooter__' as const;
const SIDE_PANEL_HEADER_GLOBAL_KEY = '__kbnSideNavPanelHeader__' as const;
const SIDE_PANEL_SECTION_ACTION_GLOBAL_KEY = '__kbnSideNavSectionAction__' as const;

type SidePanelSlotRenderer = (openerNode: { id: string }) => ReactNode;
type SectionActionRenderer = (sectionId: string) => ReactNode;

const useLabModeIsSuperShortTerm = (coreStart: CoreStart): boolean => {
  const labMode = useObservable(
    coreStart.uiSettings.get$<string>(LAB_MODE_SETTING, 'off'),
    coreStart.uiSettings.get<string>(LAB_MODE_SETTING, 'off')
  );
  return labMode === SUPER_SHORT_TERM;
};

const IntegrationsNavHeader = ({ coreStart }: { coreStart: CoreStart }) => {
  const { euiTheme } = useEuiTheme();
  const isSuperShortTerm = useLabModeIsSuperShortTerm(coreStart);
  const nestedNavEnabled = useNestedNavEnabled();
  const query = useIntegrationsSearch();

  if (!isSuperShortTerm) return null;

  // No bottom padding: the divider (and, when grouping is on, the search box)
  // should sit close to the "Starred integrations" section below, which already
  // brings its own top padding. Extra bottom padding here would stack on top of
  // it and leave an oversized gap.
  const wrapperStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
  `;

  // The two "existing experience" touchpoints live here (rather than as nav
  // sections) so the search box can sit directly above the "Starred
  // integrations" section, matching the design. They deep-link into the real
  // Metrics app. Rendered just beneath the panel title via the `sidePanelHeader`
  // slot.
  //
  // The panel wraps its content in a roving-tabindex keydown handler that
  // hijacks Arrow/Home/End to move between nav links; stop propagation here so
  // those keys behave normally inside the search box.
  return (
    <div css={wrapperStyles} onKeyDown={(event) => event.stopPropagation()}>
      <EuiListGroup gutterSize="none" flush maxWidth={false}>
        <EuiListGroupItem
          size="s"
          label={i18n.translate('xpack.streams.entityCentricLab.integrations.infraInventory', {
            defaultMessage: 'Infrastructure inventory',
          })}
          onClick={() =>
            coreStart.application.navigateToApp('metrics', { deepLinkId: 'inventory' })
          }
          data-test-subj="entityCentricLabNavInfraInventory"
        />
        <EuiListGroupItem
          size="s"
          label={i18n.translate('xpack.streams.entityCentricLab.integrations.infraHosts', {
            defaultMessage: 'Hosts (24)',
          })}
          onClick={() => coreStart.application.navigateToApp('metrics', { deepLinkId: 'hosts' })}
          data-test-subj="entityCentricLabNavInfraHosts"
        />
      </EuiListGroup>
      {/* The search box is gated on the same "Group starred integrations" toggle
          as the group-management affordances — it only appears once grouping is
          enabled. When the toggle is OFF we still keep a divider between the
          "existing experience" links and the "Starred integrations" section. */}
      {nestedNavEnabled ? (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiFieldSearch
            compressed
            fullWidth
            incremental
            value={query}
            placeholder={i18n.translate(
              'xpack.streams.entityCentricLab.integrations.searchPlaceholder',
              { defaultMessage: 'Search integrations' }
            )}
            onChange={(event) => setIntegrationsSearch(event.target.value)}
            aria-label={i18n.translate(
              'xpack.streams.entityCentricLab.integrations.searchAriaLabel',
              { defaultMessage: 'Search integrations' }
            )}
            data-test-subj="entityCentricLabIntegrationsNavSearch"
          />
        </>
      ) : (
        // Top margin only: the gap below the rule is left to the "Starred
        // integrations" section's own top padding, so it matches the
        // section-to-section divider spacing (which has no margin of its own).
        <EuiHorizontalRule
          margin="none"
          css={css`
            margin-top: ${euiTheme.size.s};
          `}
        />
      )}
    </div>
  );
};

const IntegrationsNavFooter = ({ coreStart }: { coreStart: CoreStart }) => {
  const { euiTheme } = useEuiTheme();
  const isSuperShortTerm = useLabModeIsSuperShortTerm(coreStart);
  const nestedNavEnabled = useNestedNavEnabled();

  // The panel opener id is shared with infra-short-term mode, so gate on the lab
  // mode too — grouped favorites only exist in super-short-term.
  if (!isSuperShortTerm) return null;

  const wrapperStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m} ${euiTheme.size.m};
  `;

  // "Manage groups" now lives as a cog on the "Starred integrations" section
  // header (see StarredSectionAction), so the footer only carries the toggle.
  return (
    <div css={wrapperStyles}>
      <EuiHorizontalRule margin="s" />
      <EuiSwitch
        compressed
        checked={nestedNavEnabled}
        label={i18n.translate('xpack.streams.entityCentricLab.integrations.nestedNavToggle', {
          defaultMessage: 'Group starred integrations',
        })}
        onChange={(event) => setNestedNavEnabled(event.target.checked)}
        data-test-subj="entityCentricLabNestedNavToggle"
      />
    </div>
  );
};

/**
 * The "manage groups" cog, rendered right-aligned on the "Starred integrations"
 * section header via the chrome side nav's `getSectionAction` slot (see
 * `__kbnSideNavSectionAction__`). Only appears while super-short-term is active
 * and grouped favorites are enabled — the same conditions under which the
 * Starred section (and therefore its header) is shown.
 */
const StarredSectionAction = ({ coreStart }: { coreStart: CoreStart }) => {
  const isSuperShortTerm = useLabModeIsSuperShortTerm(coreStart);
  const nestedNavEnabled = useNestedNavEnabled();
  const [isManageOpen, setIsManageOpen] = useState(false);

  if (!isSuperShortTerm || !nestedNavEnabled) return null;

  const manageGroupsLabel = i18n.translate(
    'xpack.streams.entityCentricLab.integrations.manageGroups',
    { defaultMessage: 'Manage groups' }
  );

  return (
    <>
      <EuiToolTip content={manageGroupsLabel} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType="gear"
          color="text"
          size="xs"
          aria-label={manageGroupsLabel}
          onClick={() => setIsManageOpen(true)}
          data-test-subj="entityCentricLabManageGroupsButton"
        />
      </EuiToolTip>
      {isManageOpen ? <ManageGroupsModal onClose={() => setIsManageOpen(false)} /> : null}
    </>
  );
};

/**
 * Register the Infrastructure-panel header + footer renderers on `globalThis`.
 * Idempotent — safe to call once on plugin start.
 */
export const registerIntegrationsNavFooter = (coreStart: CoreStart): void => {
  const root = globalThis as unknown as Record<string, SidePanelSlotRenderer | undefined>;
  root[SIDE_PANEL_FOOTER_GLOBAL_KEY] = (openerNode) =>
    openerNode?.id === INFRASTRUCTURE_PANEL_ID ? (
      <IntegrationsNavFooter coreStart={coreStart} />
    ) : null;
  root[SIDE_PANEL_HEADER_GLOBAL_KEY] = (openerNode) =>
    openerNode?.id === INFRASTRUCTURE_PANEL_ID ? (
      <IntegrationsNavHeader coreStart={coreStart} />
    ) : null;

  const sectionActionRoot = globalThis as unknown as Record<
    string,
    SectionActionRenderer | undefined
  >;
  sectionActionRoot[SIDE_PANEL_SECTION_ACTION_GLOBAL_KEY] = (sectionId) =>
    sectionId === STARRED_SECTION_ID ? <StarredSectionAction coreStart={coreStart} /> : null;
};
