/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_PROFILE_KEYS, DEFAULT_RULE_NAMES } from '../../../common/presets';
import type { RuleCoverage } from '../../../common/resolution';
import { getRuleCoverage } from '../../../common/resolution';
import type { BoostProfileType, BoostState } from '../../../common/types';
import { formatSize } from '../cost_format';
import { getProfileDetailsPath } from '../details_link';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { DEFAULT_PRESET_OPTIONS } from '../preset_options';
import { MatchesPopover } from '../rules/rule_matches';
import { ProjectDefaultFlyout } from './project_default_flyout';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

// The icons simple mode used for each type.
const TYPE_ICONS: Readonly<Record<BoostProfileType, string>> = {
  indices: 'table',
  data_streams: 'productStreamsClassic',
};

// Each default is its type's default boost rule, as the rules table lists it.
const getDefaultRuleTip = (type: BoostProfileType, ruleName: string): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.boost.projectDefaults.dataStreamsRuleTip', {
        defaultMessage:
          'Sets the boost profile of the default rule "{ruleName}", which applies to every data stream no other rule targets.',
        values: { ruleName },
      })
    : i18n.translate('xpack.boost.projectDefaults.indicesRuleTip', {
        defaultMessage:
          'Sets the boost profile of the default rule "{ruleName}", which applies to every index no other rule targets.',
        values: { ruleName },
      });

const CUSTOM_PROFILE_DESCRIPTION = i18n.translate('xpack.boost.projectDefaults.customProfile', {
  defaultMessage: 'Using a selected custom boost profile.',
});

interface ProjectDefaultsProps {
  state: BoostState;
  canEdit: boolean;
}

/**
 * The project's defaults for indices and for data streams, which apply to whatever no boost rule
 * matches. Each shows its current choice prominently, with what it applies to, and an edit button
 * that opens its editor.
 */
export const ProjectDefaults = ({ state, canEdit }: ProjectDefaultsProps) => {
  const [editedType, setEditedType] = useState<BoostProfileType>();
  const { settings, rules, profiles, data_sources: dataSources } = state;
  const coverage = getRuleCoverage(dataSources, rules, profiles);
  const hiddenNames = new Set(dataSources.filter(({ hidden }) => hidden).map(({ name }) => name));

  return (
    <section data-test-subj="boostProjectDefaults">
      <EuiTitle size="xs">
        <h2>
          {i18n.translate('xpack.boost.projectDefaults.title', {
            defaultMessage: 'Project defaults',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l">
        {PROFILE_TYPES.map((type) => {
          const ruleName = DEFAULT_RULE_NAMES[type];
          const rule = rules.find(({ name }) => name === ruleName);
          const ruleCoverage = coverage.get(ruleName);
          // A default rule matches everything of its type, so what it applies to is what it matches
          // that no higher-ranked rule takes.
          const appliedSize = dataSources
            .filter(
              ({ name }) =>
                ruleCoverage?.matchedNames.includes(name) && !ruleCoverage.supersededBy.has(name)
            )
            .reduce((total, { size_in_bytes: bytes }) => total + bytes, 0);
          return (
            <EuiFlexItem key={type}>
              <ProjectDefaultPanel
                type={type}
                ruleName={ruleName}
                patterns={rule?.index_patterns ?? []}
                profileName={settings.default_profiles[DEFAULT_PROFILE_KEYS[type]]}
                coverage={
                  ruleCoverage ?? {
                    matches: 0,
                    matchedNames: [],
                    appliesTo: 0,
                    supersededBy: new Map(),
                  }
                }
                appliedSize={appliedSize}
                hiddenNames={hiddenNames}
                onEdit={canEdit ? () => setEditedType(type) : undefined}
              />
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>

      {editedType && (
        <ProjectDefaultFlyout type={editedType} onClose={() => setEditedType(undefined)} />
      )}
    </section>
  );
};

interface ProjectDefaultPanelProps {
  type: BoostProfileType;
  /** The default boost rule the default sets the profile of. */
  ruleName: string;
  patterns: readonly string[];
  profileName: string;
  /** What the default rule matches, and what it applies to after other rules, with its data. */
  coverage: RuleCoverage;
  appliedSize: number;
  hiddenNames: ReadonlySet<string>;
  /** Opens the editor; omitted when the user can't edit. */
  onEdit?: () => void;
}

/** One project default as a stat: its choice, what that means, and what it applies to. */
const ProjectDefaultPanel = ({
  type,
  ruleName,
  patterns,
  profileName,
  coverage,
  appliedSize,
  hiddenNames,
  onEdit,
}: ProjectDefaultPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { lineHeight: labelLineHeight } = useEuiFontSize('s');
  const history = useHistory();
  const preset = DEFAULT_PRESET_OPTIONS[type].find((option) => option.profileName === profileName);
  const inlineCss = { display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      css={{
        blockSize: '100%',
        // Centering the label on the edit button sets it below the panel's top padding by half
        // their difference in height, so the bottom gets the same, keeping the content balanced.
        paddingBlockEnd: onEdit
          ? `calc(${euiTheme.size.base} + (${euiTheme.size.xl} - ${labelLineHeight}) / 2)`
          : undefined,
      }}
      data-test-subj={`boostProjectDefault-${type}`}
    >
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        {/* The type's icon accents the stat beside it, on a subdued tile larger than any button, so
            it doesn't read as one. */}
        <EuiFlexItem grow={false}>
          <EuiPanel
            color="subdued"
            hasShadow={false}
            grow={false}
            paddingSize="none"
            css={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              inlineSize: euiTheme.size.xxxxl,
              blockSize: euiTheme.size.xxxxl,
            }}
            aria-hidden={true}
          >
            <EuiIcon type={TYPE_ICONS[type]} size="xl" aria-hidden={true} />
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiStat
            description={
              // The label shares a row with the edit button, centered on it.
              <span
                css={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: euiTheme.size.s,
                }}
              >
                <span css={{ ...inlineCss, gap: euiTheme.size.xs }}>
                  {PROFILE_TYPE_LABELS[type]}
                  <EuiIconTip
                    type="info"
                    color="subdued"
                    content={getDefaultRuleTip(type, ruleName)}
                    aria-label={i18n.translate('xpack.boost.projectDefaults.ruleTipLabel', {
                      defaultMessage: 'About the default for {type}',
                      values: { type: PROFILE_TYPE_LABELS[type].toLowerCase() },
                    })}
                    anchorProps={{ 'data-test-subj': `boostProjectDefaultRuleTip-${type}` }}
                  />
                </span>
                {onEdit && (
                  <EuiButton
                    size="s"
                    onClick={onEdit}
                    aria-label={i18n.translate('xpack.boost.projectDefaults.editLabel', {
                      defaultMessage: 'Edit the project default for {type}',
                      values: { type: PROFILE_TYPE_LABELS[type].toLowerCase() },
                    })}
                    data-test-subj={`boostEditProjectDefault-${type}`}
                  >
                    {i18n.translate('xpack.boost.projectDefaults.editButton', {
                      defaultMessage: 'Edit',
                    })}
                  </EuiButton>
                )}
              </span>
            }
            title={
              preset ? (
                preset.label
              ) : (
                // A custom profile's details are a button away, which keeps the large name plain.
                <span css={inlineCss}>
                  {profileName}
                  <EuiButtonIcon
                    iconType="link"
                    color="text"
                    {...reactRouterNavigate(history, getProfileDetailsPath(profileName))}
                    aria-label={i18n.translate('xpack.boost.projectDefaults.viewProfile', {
                      defaultMessage: 'View boost profile "{profileName}"',
                      values: { profileName },
                    })}
                    data-test-subj={`boostProjectDefaultProfileLink-${type}`}
                  />
                </span>
              )
            }
            // A step down from the default, so the values don't overpower the page.
            titleSize="m"
            data-test-subj={`boostProjectDefaultValue-${type}`}
          >
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>{preset ? preset.description : CUSTOM_PROFILE_DESCRIPTION}</p>
            </EuiText>
            {/* What the default applies to: how many, which opens the list of what it matches and
                what other rules outrank it for, as the rules table does, and how much data. */}
            <EuiSpacer size="s" />
            <EuiBadgeGroup gutterSize="s">
              {coverage.matches > 0 ? (
                <MatchesPopover
                  patterns={patterns}
                  type={type}
                  coverage={coverage}
                  hiddenNames={hiddenNames}
                  renderButton={({ onClick }) => (
                    <EuiBadge
                      color="hollow"
                      onClick={onClick}
                      // The label replaces the count for screen readers, so it says it too.
                      onClickAriaLabel={i18n.translate('xpack.boost.projectDefaults.showMatches', {
                        defaultMessage: '{count}. Show what the default for {type} matches',
                        values: {
                          count: formatDataSourceCount(type, coverage.appliesTo),
                          type: PROFILE_TYPE_LABELS[type].toLowerCase(),
                        },
                      })}
                      data-test-subj={`boostProjectDefaultCount-${type}`}
                    >
                      {formatDataSourceCount(type, coverage.appliesTo)}
                    </EuiBadge>
                  )}
                />
              ) : (
                <EuiBadge color="hollow" data-test-subj={`boostProjectDefaultCount-${type}`}>
                  {formatDataSourceCount(type, 0)}
                </EuiBadge>
              )}
              <EuiBadge color="hollow" data-test-subj={`boostProjectDefaultSize-${type}`}>
                {formatSize(appliedSize)}
              </EuiBadge>
            </EuiBadgeGroup>
          </EuiStat>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
