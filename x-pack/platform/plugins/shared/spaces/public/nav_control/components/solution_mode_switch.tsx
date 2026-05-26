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
import { getNightshiftIconDataUrl } from '../../../common';
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

const STANDARD_ID: SolutionView = 'oblt';
const NIGHTSHIFT_ID: SolutionView = 'nightshift';

const DARK_MODE_SETTING_ID = 'theme:darkMode';

/**
 * Per-mode landing URLs (relative to Kibana's basePath). After flipping the
 * toggle we navigate the user here rather than reloading the current page,
 * so they always start in the right "home" for the mode they just chose.
 */
const STANDARD_LANDING_PATH = '/app/observability/overview';
const NIGHTSHIFT_LANDING_PATH = '/app/observability/nightshift';

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
export const SolutionModeSwitch: React.FC<Props> = ({
  spacesManager,
  activeSpace,
  serverBasePath,
  uiSettings,
}) => {
  const [isSwitching, setIsSwitching] = useState(false);

  const idSelected = activeSpace.solution === NIGHTSHIFT_ID ? NIGHTSHIFT_ID : STANDARD_ID;

  const handleChange = async (nextSolution: string) => {
    if (isSwitching || nextSolution === idSelected) return;
    setIsSwitching(true);
    try {
      await spacesManager.updateSpace({
        ...activeSpace,
        solution: nextSolution as SolutionView,
      });
      // Couple dark mode with the selected mode: Nightshift → enabled,
      // Standard → disabled. Best-effort: if user-profile dark mode is set
      // or the setting is locked down by config, this set won't visibly
      // flip the rendered theme, but we still proceed with the reload.
      if (uiSettings) {
        const nextDarkMode = nextSolution === NIGHTSHIFT_ID ? 'enabled' : 'disabled';
        try {
          await uiSettings.set(DARK_MODE_SETTING_ID, nextDarkMode);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[Nightshift] Failed to update theme:darkMode setting', err);
        }
      }
      try {
        const loadingMessage =
          nextSolution === NIGHTSHIFT_ID
            ? i18n.translate('xpack.spaces.navControl.solutionModeSwitch.loadingNightshift', {
                defaultMessage: 'Switching to Nightshift mode\u2026',
              })
            : i18n.translate('xpack.spaces.navControl.solutionModeSwitch.loadingStandard', {
                defaultMessage: 'Switching to Standard mode\u2026',
              });
        window.sessionStorage.setItem(LOADING_MESSAGE_OVERRIDE_KEY, loadingMessage);
        window.sessionStorage.setItem(LOADING_MODE_KEY, nextSolution);
      } catch {
        // sessionStorage can be unavailable; ignore — we still navigate.
      }
      // Navigate to the mode's landing page (full page navigation, not a
      // soft reload). The full navigation is what causes the navigation
      // plugin to re-evaluate the active space's solution view and swap the
      // side nav tree on the next boot.
      const landingPath =
        nextSolution === NIGHTSHIFT_ID ? NIGHTSHIFT_LANDING_PATH : STANDARD_LANDING_PATH;
      window.location.assign(`${serverBasePath}${landingPath}`);
    } catch (e) {
      setIsSwitching(false);
    }
  };

  const options = [
    {
      id: STANDARD_ID,
      label: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoObservability" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.spaces.navControl.solutionModeSwitch.standardLabel', {
              defaultMessage: 'Standard',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': 'solutionModeSwitchStandard',
    },
    {
      id: NIGHTSHIFT_ID,
      label: (
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type={getNightshiftIconDataUrl({ size: 16 })} size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.spaces.navControl.solutionModeSwitch.nightshiftLabel', {
              defaultMessage: 'Nightshift',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      'data-test-subj': 'solutionModeSwitchNightshift',
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
        <h6>
          {i18n.translate('xpack.spaces.navControl.solutionModeSwitch.label', {
            defaultMessage: 'Observability Mode',
          })}
        </h6>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        legend={i18n.translate('xpack.spaces.navControl.solutionModeSwitch.legend', {
          defaultMessage: 'Switch between Standard and Nightshift',
        })}
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
