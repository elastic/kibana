/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiButtonEmpty, EuiDescriptionList, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';

interface PluginDetailsProps {
  plugin: PluginDefinition;
}

export const PluginDetails: React.FC<PluginDetailsProps> = ({ plugin }) => {
  const { euiTheme } = useEuiTheme();
  const { createAgentBuilderUrl } = useNavigation();

  const descriptionListItems = useMemo(
    () => [
      {
        title: labels.plugins.idLabel,
        description: plugin.id,
      },
      {
        title: labels.plugins.nameLabel,
        description: plugin.name,
      },
      {
        title: labels.plugins.versionLabel,
        description: plugin.version,
      },
      {
        title: labels.plugins.descriptionLabel,
        description: plugin.description || <EuiText color="subdued">&mdash;</EuiText>,
      },
      {
        title: labels.plugins.sourceLabel,
        description: plugin.source_url ? (
          <EuiLink href={plugin.source_url} target="_blank" external>
            {plugin.source_url}
          </EuiLink>
        ) : (
          <EuiText color="subdued">&mdash;</EuiText>
        ),
      },
      {
        title: labels.plugins.authorLabel,
        description: plugin.manifest.author?.name || <EuiText color="subdued">&mdash;</EuiText>,
      },
      {
        title: labels.plugins.skillsLabel,
        description:
          plugin.skill_ids.length > 0 ? (
            <ul>
              {plugin.skill_ids.map((skillId) => (
                <li key={skillId}>
                  <EuiLink
                    href={createAgentBuilderUrl(appPaths.skills.details({ skillId }))}
                    data-test-subj={`agentBuilderPluginSkillLink-${skillId}`}
                  >
                    - {skillId}
                  </EuiLink>
                </li>
              ))}
            </ul>
          ) : (
            labels.plugins.noSkillsLabel
          ),
      },
    ],
    [plugin, createAgentBuilderUrl]
  );

  return (
    <KibanaPageTemplate data-test-subj="agentBuilderPluginDetailsPage">
      <KibanaPageTemplate.Header
        pageTitle={plugin.name}
        css={css`
          background-color: ${euiTheme.colors.backgroundBasePlain};
          border-block-end: none;
        `}
        rightSideItems={[
          <EuiButtonEmpty
            key="back-to-plugins"
            iconType="arrowLeft"
            href={createAgentBuilderUrl(appPaths.plugins.list)}
            data-test-subj="agentBuilderBackToPluginsButton"
          >
            {labels.plugins.backToPluginsButton}
          </EuiButtonEmpty>,
        ]}
      />
      <KibanaPageTemplate.Section>
        <EuiDescriptionList
          type="column"
          listItems={descriptionListItems}
          columnWidths={[1, 3]}
          data-test-subj="agentBuilderPluginDetailsDescriptionList"
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
