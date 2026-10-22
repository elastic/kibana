/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { DEFAULT_PROFILE_KEYS, DEFAULT_RULE_NAMES } from '../../../common/presets';
import { getAppliedRules } from '../../../common/resolution';
import type { BoostProfileType, BoostState } from '../../../common/types';
import { formatSize } from '../cost_format';
import { DetailsLink, getRuleDetailsPath } from '../details_link';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { DEFAULT_PRESET_OPTIONS } from '../preset_options';
import { ProjectDefaultFlyout } from './project_default_flyout';

const PROFILE_TYPES: readonly BoostProfileType[] = ['indices', 'data_streams'];

const CUSTOM_PROFILE_LABEL = i18n.translate('xpack.boost.projectDefaults.customProfile', {
  defaultMessage: 'Custom boost profile',
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
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.boost.projectDefaults.description', {
            defaultMessage:
              'Boost for any index or data stream that no boost rule matches. Each default sets what its default boost rule uses.',
          })}
        </p>
      </EuiText>
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
  const history = useHistory();
  const preset = DEFAULT_PRESET_OPTIONS[type].find((option) => option.profileName === profileName);

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
            description={PROFILE_TYPE_LABELS[type]}
            // A custom profile links to its details; a preset is described below instead.
            title={preset ? preset.label : <DetailsLink kind="profile" name={profileName} />}
            titleSize="m"
            titleElement="p"
            descriptionElement="h3"
            data-test-subj={`boostProjectDefaultValue-${type}`}
          >
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p>{preset ? preset.description : CUSTOM_PROFILE_LABEL}</p>
            </EuiText>
            <EuiSpacer size="s" />
            <EuiText size="xs">
              <p>
                <FormattedMessage
                  id="xpack.boost.projectDefaults.appliesTo"
                  defaultMessage="Applies to {targets} · {size}"
                  values={{
                    targets: (
                      <EuiLink
                        {...reactRouterNavigate(
                          history,
                          getRuleDetailsPath(DEFAULT_RULE_NAMES[type])
                        )}
                        data-test-subj={`boostProjectDefaultRule-${type}`}
                      >
                        {formatDataSourceCount(type, appliedCount)}
                      </EuiLink>
                    ),
                    size: formatSize(appliedSize),
                  }}
                />
              </p>
            </EuiText>
          </EuiStat>
        </EuiFlexItem>
        {onEdit && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
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
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
