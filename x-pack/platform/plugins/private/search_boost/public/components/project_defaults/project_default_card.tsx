/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
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

import type { BoostProfileBase, BoostProfileType, BoostRuleMatch } from '../../../common/types';
import {
  CUSTOM_PROFILE_DESCRIPTION,
  EDIT_BUTTON_LABEL,
  PROFILE_TYPE_LABELS,
  formatTargetCount,
  getDefaultRuleTip,
  getDefaultRuleTipLabel,
  getEditProjectDefaultLabel,
  getManagedProfileMessage,
  getShowDefaultMatchesA11yLabel,
  getViewProfileLabel,
} from '../../translations';
import { MatchesPopover } from '../matches_popover/matches_popover';
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
  matches: ReadonlyArray<Pick<BoostRuleMatch, 'name' | 'isHidden' | 'outrankedByRuleName'>>;
  canEdit: boolean;
  onEdit: () => void;
  onViewProfile?: (profileName: string) => void;
}

export const ProjectDefaultCard = ({
  type,
  ruleName,
  profile,
  matches,
  canEdit,
  onEdit,
  onViewProfile,
}: ProjectDefaultCardProps) => {
  const { euiTheme } = useEuiTheme();
  const typeLabelFontSize = useEuiFontSize('s');
  const [isMatchesOpen, setIsMatchesOpen] = useState(false);

  const isCustom = !profile.is_builtin;
  const managedMessage = isCustom ? undefined : getManagedProfileMessage(profile.name);
  const title = managedMessage?.label ?? profile.name;
  const description = isCustom ? CUSTOM_PROFILE_DESCRIPTION : managedMessage?.description;
  const viewProfileLabel = isCustom ? getViewProfileLabel(profile.name) : undefined;
  const appliedCount = matches.filter(({ outrankedByRuleName }) => !outrankedByRuleName).length;
  const countLabel = formatTargetCount(type, appliedCount);
  const countTestSubj = `searchBoostProjectDefaultCount-${type}`;

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
            {canEdit ? (
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
              {isCustom && onViewProfile ? (
                <span css={getInlineRowStyles(euiTheme.size.s)}>
                  {title}
                  <EuiToolTip content={viewProfileLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="link"
                      color="text"
                      onClick={() => onViewProfile(profile.name)}
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
            {matches.length > 0 ? (
              <MatchesPopover
                button={
                  <EuiBadge
                    color="hollow"
                    onClick={() => setIsMatchesOpen((open) => !open)}
                    onClickAriaLabel={getShowDefaultMatchesA11yLabel(type, appliedCount)}
                    data-test-subj={countTestSubj}
                  >
                    {countLabel}
                  </EuiBadge>
                }
                isOpen={isMatchesOpen}
                closePopover={() => setIsMatchesOpen(false)}
                type={type}
                matches={matches}
              />
            ) : (
              <EuiBadge color="hollow" data-test-subj={countTestSubj}>
                {countLabel}
              </EuiBadge>
            )}
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
