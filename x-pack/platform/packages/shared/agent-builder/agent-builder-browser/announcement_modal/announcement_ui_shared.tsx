/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export const announcementModalFooterCss = css`
  margin-top: 1em;
`;
import { AGENT_BUILDER_RELEASE_NOTES_URL } from './announcement_urls';
import * as i18n from './translations';

export function AnnouncementReleaseNotesButton() {
  return (
    <EuiButton
      href={AGENT_BUILDER_RELEASE_NOTES_URL}
      target="_blank"
      rel="noopener noreferrer"
      iconType="popout"
      iconSide="right"
      color="primary"
      fill={false}
      data-test-subj="agentBuilderAnnouncementReleaseNotesButton"
    >
      {i18n.RELEASE_NOTES_BUTTON}
    </EuiButton>
  );
}

/** Intro paragraph + three feature rows (bolt, plugs, refresh) per design. */
export function AnnouncementFeatureBulletList() {
  const { euiTheme } = useEuiTheme();

  const iconItemCss = css`
    padding-top: ${euiTheme.size.xxs};
  `;

  const featureListCss = css`
    && {
      list-style: none;
      margin: ${euiTheme.size.base} 0 0;
      padding: 0;
    }

    && li + li {
      margin-top: ${euiTheme.size.base};
    }
  `;

  return (
    <EuiText size="s">
      <p>{i18n.INTRO}</p>
      <ul css={featureListCss}>
        <li>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} css={iconItemCss}>
              <EuiIcon type="bolt" color={euiTheme.colors.textPrimary} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <strong>{i18n.FEATURE_TAKES_ACTION_TITLE}</strong> {i18n.FEATURE_TAKES_ACTION_BODY}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </li>
        <li>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} css={iconItemCss}>
              <EuiIcon type="plugs" color={euiTheme.colors.textPrimary} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <strong>{i18n.FEATURE_CONNECTS_TOOLS_TITLE}</strong>{' '}
                {i18n.FEATURE_CONNECTS_TOOLS_BODY}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </li>
        <li>
          <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
            <EuiFlexItem grow={false} css={iconItemCss}>
              <EuiIcon type="refresh" color={euiTheme.colors.textPrimary} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem>
              <span>
                <strong>{i18n.FEATURE_ITERATES_TITLE}</strong> {i18n.FEATURE_ITERATES_BODY}
              </span>
            </EuiFlexItem>
          </EuiFlexGroup>
        </li>
      </ul>
    </EuiText>
  );
}
