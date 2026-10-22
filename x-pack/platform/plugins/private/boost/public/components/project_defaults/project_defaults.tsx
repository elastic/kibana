/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_PROFILE_KEYS, DEFAULT_RULE_NAMES } from '../../../common/presets';
import { getAppliedRules } from '../../../common/resolution';
import type { BoostProfileType, BoostState } from '../../../common/types';
import { formatSize } from '../cost_format';
import { getProfileDetailsPath } from '../details_link';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { DEFAULT_PRESET_OPTIONS } from '../preset_options';
import { ProjectDefaultFlyout } from './project_default_flyout';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

// The icons simple mode used for each type.
const TYPE_ICONS: Readonly<Record<BoostProfileType, string>> = {
  indices: 'table',
  data_streams: 'productStreamsClassic',
};

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
  const appliedRules = getAppliedRules(dataSources, rules, profiles);

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
          const applied = dataSources.filter(
            ({ name }) => appliedRules.get(name)?.name === ruleName
          );
          return (
            <EuiFlexItem key={type}>
              <ProjectDefaultPanel
                type={type}
                profileName={settings.default_profiles[DEFAULT_PROFILE_KEYS[type]]}
                appliedCount={applied.length}
                appliedSize={applied.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0)}
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
  profileName: string;
  /** How many indices or data streams the default applies to, and their data. */
  appliedCount: number;
  appliedSize: number;
  /** Opens the editor; omitted when the user can't edit. */
  onEdit?: () => void;
}

/** One project default as a stat: its choice, what that means, and what it applies to. */
const ProjectDefaultPanel = ({
  type,
  profileName,
  appliedCount,
  appliedSize,
  onEdit,
}: ProjectDefaultPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const preset = DEFAULT_PRESET_OPTIONS[type].find((option) => option.profileName === profileName);
  const inlineCss = { display: 'inline-flex', alignItems: 'center', gap: euiTheme.size.s };

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      css={{ blockSize: '100%' }}
      data-test-subj={`boostProjectDefault-${type}`}
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="flexStart"
        gutterSize="s"
        responsive={false}
      >
        <EuiFlexItem>
          <EuiStat
            description={
              <span css={inlineCss}>
                <EuiIcon type={TYPE_ICONS[type]} aria-hidden={true} />
                {PROFILE_TYPE_LABELS[type]}
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
            data-test-subj={`boostProjectDefaultValue-${type}`}
          >
            <EuiSpacer size="xs" />
            <EuiText size="s" color="subdued">
              <p>{preset ? preset.description : CUSTOM_PROFILE_DESCRIPTION}</p>
            </EuiText>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.boost.projectDefaults.appliedTo', {
                  defaultMessage: '{targets} · {size}',
                  values: {
                    targets: formatDataSourceCount(type, appliedCount),
                    size: formatSize(appliedSize),
                  },
                })}
              </p>
            </EuiText>
          </EuiStat>
        </EuiFlexItem>
        {onEdit && (
          <EuiFlexItem grow={false}>
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
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
