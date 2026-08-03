/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiImage, EuiPortal, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import React, { useCallback, useRef } from 'react';

import { useKbnFullScreenBgCss } from '@kbn/css-utils/public/full_screen_bg_css';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaSolutionAvatar } from '@kbn/shared-ux-avatar-solution';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { InitialSolutionSetup } from './initial_solution_setup';
import type { SpacesManager } from '../../spaces_manager';
import * as styles from '../space_selector.styles';

interface Props {
  spacesManager: SpacesManager;
  serverBasePath: string;
  customLogo?: string;
}

export const InitialSolutionSetupPage = ({ spacesManager, serverBasePath, customLogo }: Props) => {
  const headerRef = useRef<HTMLHeadingElement | null>(null);

  const focusHeaderOnMount = useCallback((node: HTMLHeadingElement | null) => {
    headerRef.current = node;
    headerRef.current?.focus();
  }, []);

  return (
    <KibanaPageTemplate css={styles.pageTemplateStyles} data-test-subj="kibanaSpaceSelector">
      <BackgroundPortal />
      <KibanaPageTemplate.Section color="transparent" paddingSize="xl">
        <EuiText textAlign="center" size="s">
          <EuiSpacer size="xxl" />
          {customLogo ? (
            <EuiImage
              src={customLogo}
              size={64}
              alt={i18n.translate('xpack.spaces.spaceSelector.customLogoAlt', {
                defaultMessage: 'Custom logo',
              })}
            />
          ) : (
            <KibanaSolutionAvatar name="Elastic" size="xl" />
          )}
          <EuiSpacer size="xxl" />
          <EuiTextColor color="subdued">
            <h1 css={styles.headerStyles} tabIndex={-1} ref={focusHeaderOnMount}>
              <FormattedMessage
                id="xpack.spaces.spaceSelector.initialSolutionSetupTitle"
                defaultMessage="Select a solution view for your space"
              />
            </h1>
            <p>
              <FormattedMessage
                id="xpack.spaces.spaceSelector.initialSolutionSetupDescription"
                defaultMessage="Solution views offer focused, solution-based navigation. You can change the solution view in space settings later."
              />
            </p>
          </EuiTextColor>
        </EuiText>
        <EuiSpacer size="xl" />
        <InitialSolutionSetup spacesManager={spacesManager} serverBasePath={serverBasePath} />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

const BackgroundPortal = React.memo(function BackgroundPortal() {
  const kbnFullScreenBgCss = useKbnFullScreenBgCss();
  return (
    <EuiPortal>
      <div
        className="spcSelectorBackground spcSelectorBackground__nonMixinAttributes"
        css={kbnFullScreenBgCss}
        role="presentation"
      />
    </EuiPortal>
  );
});
