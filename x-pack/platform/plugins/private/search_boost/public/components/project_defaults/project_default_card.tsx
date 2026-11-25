/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { isManagedProfile } from '../../../common/profiles';
import type { BoostProfileBase, BoostProfileType, BoostRuleMatch } from '../../../common/types';
import {
  CUSTOM_PROFILE_DESCRIPTION,
  EDIT_BUTTON_LABEL,
  PROFILE_TYPE_LABELS,
  getDefaultRuleTip,
  getDefaultRuleTipLabel,
  getEditProjectDefaultLabel,
  getLabeledProfileMessage,
  getShowDefaultMatchesA11yLabel,
  getViewProfileLabel,
} from '../../translations';
import type { LinkProps } from '../../types';
import { MatchesBadge } from '../matches_badge/matches_badge';
import { ProjectDefaultCardIcon } from './project_default_card_icon';

const getInlineRowStyles = (gap: string) => css`
  display: inline-flex;
  align-items: center;
  gap: ${gap};
`;

export interface ProjectDefaultCardProps {
  type: BoostProfileType;
  ruleName: string;
  profile: BoostProfileBase;
  matches: readonly BoostRuleMatch[];
  canEdit: boolean;
  /** Left out hides "Edit". */
  onEdit?: () => void;
  getProfileLinkProps?: (profileName: string) => LinkProps;
}

export const ProjectDefaultCard = ({
  type,
  ruleName,
  profile,
  matches,
  canEdit,
  onEdit,
  getProfileLinkProps,
}: ProjectDefaultCardProps) => {
  const { euiTheme } = useEuiTheme();
  const typeLabelFontSize = useEuiFontSize('s');

  const isCustom = !isManagedProfile(profile);
  const labeledMessage = isCustom ? undefined : getLabeledProfileMessage(profile.name);
  const title = labeledMessage?.label ?? profile.name;
  const description = isCustom ? CUSTOM_PROFILE_DESCRIPTION : labeledMessage?.description;
  const viewProfileLabel = isCustom ? getViewProfileLabel(profile.name) : undefined;
  return (
    <EuiPanel hasBorder hasShadow={false} data-test-subj={`searchBoostProjectDefault-${type}`}>
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <ProjectDefaultCardIcon type={type} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <h3 css={typeLabelFontSize}>{PROFILE_TYPE_LABELS[type]}</h3>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    size="m"
                    content={getDefaultRuleTip(type, ruleName)}
                    aria-label={getDefaultRuleTipLabel(type)}
                    anchorProps={{
                      'data-test-subj': `searchBoostProjectDefaultRuleTip-${type}`,
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {canEdit && onEdit ? (
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  onClick={onEdit}
                  aria-label={getEditProjectDefaultLabel(type)}
                  data-test-subj={`searchBoostEditProjectDefault-${type}`}
                >
                  {EDIT_BUTTON_LABEL}
                </EuiButton>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
          <EuiTitle size="m">
            <p data-test-subj={`searchBoostProjectDefaultValue-${type}`}>
              {isCustom && getProfileLinkProps ? (
                <span css={getInlineRowStyles(euiTheme.size.s)}>
                  {title}
                  <EuiToolTip content={viewProfileLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      {...getProfileLinkProps(profile.name)}
                      iconType="link"
                      color="text"
                      aria-label={viewProfileLabel}
                      data-test-subj={`searchBoostProjectDefaultProfileLink-${type}`}
                    />
                  </EuiToolTip>
                </span>
              ) : (
                title
              )}
            </p>
          </EuiTitle>
          {description ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{description}</p>
              </EuiText>
            </>
          ) : null}
          <EuiSpacer size="s" />
          <div>
            <MatchesBadge
              type={type}
              matches={matches}
              getOnClickAriaLabel={(count) => getShowDefaultMatchesA11yLabel(type, count)}
              data-test-subj={`searchBoostProjectDefaultCount-${type}`}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
