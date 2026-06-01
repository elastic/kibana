/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

import type { IUiSettingsClient } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { Space, SolutionView } from '../../../common';
import { DEFAULT_SPACE_ID, getDaybreakIconDataUrl, getNightshiftIconDataUrl } from '../../../common';
import type { SpacesManager } from '../../spaces_manager';

interface Props {
  spacesManager: SpacesManager;
  activeSpace: Space;
  /**
   * Kibana's server base path (e.g. `''` or `'/abc'`). Prepended to the
   * mode-specific landing path when we navigate after the switch so we land
   * on the correct page regardless of where in the app the user clicked the
   * toggle from.
   */
  serverBasePath: string;
  uiSettings?: IUiSettingsClient;
}

/* ----------------------------------------------------------------------- *
 * Two parallel mode pairs the switcher knows how to render:
 *
 *  - Observability spaces: Standard (oblt) ⇄ Nightshift
 *  - Security spaces:      Classic Security ⇄ Daybreak
 *
 * The pair is picked off the active space's `solution`; the switcher
 * stays hidden if the active space isn't in one of the four solutions
 * listed below.
 * ----------------------------------------------------------------------- */

type ModeFamily = 'observability' | 'security';

const STANDARD_ID: SolutionView = 'oblt';
const NIGHTSHIFT_ID: SolutionView = 'nightshift';
const CLASSIC_SECURITY_ID: SolutionView = 'security';
const DAYBREAK_ID: SolutionView = 'daybreak';

const DARK_MODE_SETTING_ID = 'theme:darkMode';

/**
 * Per-mode landing URLs (relative to Kibana's basePath). After flipping the
 * toggle we navigate the user here rather than reloading the current page,
 * so they always start in the right "home" for the mode they just chose.
 */
const STANDARD_LANDING_PATH = '/app/observability/overview';
const NIGHTSHIFT_LANDING_PATH = '/app/observability/nightshift';
const CLASSIC_SECURITY_LANDING_PATH = '/app/security/get_started';
const DAYBREAK_LANDING_PATH = '/app/security/daybreak';

const familyForSolution = (solution: SolutionView | undefined): ModeFamily | undefined => {
  if (solution === STANDARD_ID || solution === NIGHTSHIFT_ID) return 'observability';
  if (solution === CLASSIC_SECURITY_ID || solution === DAYBREAK_ID) return 'security';
  return undefined;
};

interface ModePair {
  family: ModeFamily;
  classicId: SolutionView;
  aiId: SolutionView;
  classicLandingPath: string;
  aiLandingPath: string;
  sectionLabel: string;
  legendLabel: string;
  classicLabel: string;
  aiLabel: string;
  classicIconType: string;
  aiIconDataUrl: string;
  classicLoadingMessage: string;
  aiLoadingMessage: string;
  classicDataTestSubj: string;
  aiDataTestSubj: string;
}

/**
 * sessionStorage key consumed by Kibana's bootstrap template
 * (`src/core/packages/rendering/server-internal/src/bootstrap/render_template.ts`)
 * to override the default "Loading Elastic" loading text on the next boot.
 */
const LOADING_MESSAGE_OVERRIDE_KEY = 'kbn:loadingMessageOverride';

/**
 * Companion key that tells the bootstrap which mode we're switching INTO.
 * Used to gate Nightshift-only loading decorations (the decorative wave SVG)
 * so they only render when entering Nightshift, not when leaving it.
 */
const LOADING_MODE_KEY = 'kbn:loadingMode';

/**
 * Slim "Mode" section rendered below the existing spaces list in the header
 * spaces popover. Lets the user flip the currently active space between
 * Standard (Observability) and Nightshift modes. Each space stores its mode
 * independently on `space.solution`, so switching here only affects whichever
 * space is currently active.
 *
 * Picking the other option:
 *  - Writes `space.solution` via `spacesManager.updateSpace`.
 *  - Flips `theme:darkMode` to enabled / disabled (best-effort).
 *  - Sets sessionStorage flags so the next boot shows the themed
 *    "Switching to ... mode" loader (and, only for Nightshift, the
 *    decorative aurora SVG).
 *  - Full-page reloads so the navigation plugin re-evaluates the active
 *    space's solution view and swaps the side nav tree.
 */
const OBSERVABILITY_PAIR: ModePair = {
  family: 'observability',
  classicId: STANDARD_ID,
  aiId: NIGHTSHIFT_ID,
  classicLandingPath: STANDARD_LANDING_PATH,
  aiLandingPath: NIGHTSHIFT_LANDING_PATH,
  sectionLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.label', {
    defaultMessage: 'Observability Mode',
  }),
  legendLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.legend', {
    defaultMessage: 'Switch between Standard and Nightshift',
  }),
  classicLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.standardLabel', {
    defaultMessage: 'Standard',
  }),
  aiLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.nightshiftLabel', {
    defaultMessage: 'Nightshift',
  }),
  classicIconType: 'logoObservability',
  aiIconDataUrl: getNightshiftIconDataUrl({ size: 16 }),
  classicLoadingMessage: i18n.translate(
    'xpack.spaces.navControl.solutionModeSwitch.loadingStandard',
    { defaultMessage: 'Switching to Standard mode\u2026' }
  ),
  aiLoadingMessage: i18n.translate(
    'xpack.spaces.navControl.solutionModeSwitch.loadingNightshift',
    { defaultMessage: 'Switching to Nightshift mode\u2026' }
  ),
  classicDataTestSubj: 'solutionModeSwitchStandard',
  aiDataTestSubj: 'solutionModeSwitchNightshift',
};

const SECURITY_PAIR: ModePair = {
  family: 'security',
  classicId: CLASSIC_SECURITY_ID,
  aiId: DAYBREAK_ID,
  classicLandingPath: CLASSIC_SECURITY_LANDING_PATH,
  aiLandingPath: DAYBREAK_LANDING_PATH,
  sectionLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.securityLabel', {
    defaultMessage: 'Security Mode',
  }),
  legendLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.securityLegend', {
    defaultMessage: 'Switch between Classic Security and Daybreak',
  }),
  classicLabel: i18n.translate(
    'xpack.spaces.navControl.solutionModeSwitch.classicSecurityLabel',
    { defaultMessage: 'Classic' }
  ),
  aiLabel: i18n.translate('xpack.spaces.navControl.solutionModeSwitch.daybreakLabel', {
    defaultMessage: 'Daybreak',
  }),
  classicIconType: 'logoSecurity',
  aiIconDataUrl: getDaybreakIconDataUrl({ size: 16 }),
  classicLoadingMessage: i18n.translate(
    'xpack.spaces.navControl.solutionModeSwitch.loadingClassicSecurity',
    { defaultMessage: 'Switching to Classic Security mode\u2026' }
  ),
  aiLoadingMessage: i18n.translate(
    'xpack.spaces.navControl.solutionModeSwitch.loadingDaybreak',
    { defaultMessage: 'Switching to Daybreak mode\u2026' }
  ),
  classicDataTestSubj: 'solutionModeSwitchClassicSecurity',
  aiDataTestSubj: 'solutionModeSwitchDaybreak',
};

const MODE_PAIRS: Record<ModeFamily, ModePair> = {
  observability: OBSERVABILITY_PAIR,
  security: SECURITY_PAIR,
};

export const SolutionModeSwitch: React.FC<Props> = ({
  spacesManager,
  activeSpace,
  serverBasePath,
  uiSettings,
}) => {
  const [isSwitching, setIsSwitching] = useState(false);

  const family = familyForSolution(activeSpace.solution);
  if (!family) {
    // No mode pair for this solution (e.g. classic, es, workplaceai) —
    // hide the switcher rather than rendering a confusing empty toggle.
    return null;
  }
  const pair = MODE_PAIRS[family];
  const idSelected = activeSpace.solution === pair.aiId ? pair.aiId : pair.classicId;

  const handleChange = async (nextSolution: string) => {
    if (isSwitching || nextSolution === idSelected) return;
    setIsSwitching(true);
    try {
      await spacesManager.updateSpace({
        ...activeSpace,
        solution: nextSolution as SolutionView,
      });
      // Couple dark mode with the selected mode: AI mode (Nightshift /
      // Daybreak) → enabled, classic mode → disabled. Best-effort: if
      // user-profile dark mode is set or the setting is locked down by
      // config, this won't visibly flip the rendered theme, but we still
      // proceed with the reload.
      if (uiSettings) {
        const nextDarkMode = nextSolution === pair.aiId ? 'enabled' : 'disabled';
        try {
          await uiSettings.set(DARK_MODE_SETTING_ID, nextDarkMode);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[SolutionModeSwitch] Failed to update theme:darkMode setting', err);
        }
      }
      try {
        const loadingMessage =
          nextSolution === pair.aiId ? pair.aiLoadingMessage : pair.classicLoadingMessage;
        window.sessionStorage.setItem(LOADING_MESSAGE_OVERRIDE_KEY, loadingMessage);
        window.sessionStorage.setItem(LOADING_MODE_KEY, nextSolution);
      } catch {
        // sessionStorage can be unavailable; ignore — we still navigate.
      }
      // Navigate to the mode's landing page (full page navigation, not a
      // soft reload). The full navigation is what causes the navigation
      // plugin to re-evaluate the active space's solution view and swap
      // the side nav tree on the next boot.
      //
      // URL shape:  {serverBasePath}{spacePrefix}{landingPath}
      //   - serverBasePath:  Kibana's HTTP base path (e.g. `/kbn`).
      //   - spacePrefix:     `/s/{spaceId}` for non-default spaces, empty
      //                      for the default space. Without this prefix
      //                      the navigation drops us out of the current
      //                      space, which would let the chrome boot in
      //                      the default space and ignore the solution
      //                      switch we just persisted.
      //   - landingPath:     the mode's app-relative landing route.
      const landingPath =
        nextSolution === pair.aiId ? pair.aiLandingPath : pair.classicLandingPath;
      const spacePrefix =
        activeSpace.id && activeSpace.id !== DEFAULT_SPACE_ID ? `/s/${activeSpace.id}` : '';
      window.location.assign(`${serverBasePath}${spacePrefix}${landingPath}`);
    } catch (e) {
      setIsSwitching(false);
    }
  };

  const options = [
    {
      id: pair.classicId,
      label: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={pair.classicIconType} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{pair.classicLabel}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': pair.classicDataTestSubj,
    },
    {
      id: pair.aiId,
      label: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={pair.aiIconDataUrl} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{pair.aiLabel}</EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': pair.aiDataTestSubj,
    },
  ];

  return (
    <div
      data-test-subj="solutionModeSwitchPanel"
      css={css`
        padding: 8px 12px 12px;
      `}
    >
      <EuiHorizontalRule margin="xs" />
      <EuiTitle size="xxs">
        <h6>{pair.sectionLabel}</h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        legend={pair.legendLabel}
        options={options}
        idSelected={idSelected}
        onChange={handleChange}
        isDisabled={isSwitching}
        isFullWidth
        buttonSize="compressed"
        color="primary"
        type="single"
        data-test-subj="solutionModeSwitch"
      />
    </div>
  );
};
