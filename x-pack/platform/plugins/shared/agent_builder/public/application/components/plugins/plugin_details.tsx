/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { PluginDefinition } from '@kbn/agent-builder-common';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { labels } from '../../utils/i18n';

interface PluginDetailsProps {
  plugin: PluginDefinition;
}

const SectionHeader: React.FC<{
  icon: string;
  titleId: string;
  title: string;
  description: string;
}> = ({ icon, titleId, title, description }) => (
  <EuiFlexItem grow={1}>
    <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexStart">
      <EuiFlexGroup direction="row" gutterSize="s" alignItems="center">
        <EuiIcon type={icon} aria-hidden={true} />
        <EuiTitle size="xs">
          <h2 id={titleId}>{title}</h2>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiText size="s" color="subdued">
        {description}
      </EuiText>
    </EuiFlexGroup>
  </EuiFlexItem>
);

const FieldRow: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <>
    <EuiTitle size="xxs">
      <h3>{label}</h3>
    </EuiTitle>
    <EuiSpacer size="xs" />
    <EuiText size="s">{children}</EuiText>
    <EuiSpacer size="m" />
  </>
);

export const PluginDetails: React.FC<PluginDetailsProps> = ({ plugin }) => {
  const { euiTheme } = useEuiTheme();
  const { createAgentBuilderUrl } = useNavigation();

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
        {/* Identity section */}
        <EuiFlexGroup
          direction="row"
          gutterSize="xl"
          alignItems="flexStart"
          aria-labelledby="plugin-identity-section"
        >
          <SectionHeader
            icon="bullseye"
            titleId="plugin-identity-section"
            title={labels.plugins.identitySectionTitle}
            description={labels.plugins.identitySectionDescription}
          />
          <EuiFlexItem grow={2}>
            <FieldRow label={labels.plugins.idLabel}>
              <EuiCode>{plugin.id}</EuiCode>
            </FieldRow>
            <FieldRow label={labels.plugins.nameLabel}>
              <p>{plugin.name}</p>
            </FieldRow>
            <FieldRow label={labels.plugins.versionLabel}>
              <p>{plugin.version}</p>
            </FieldRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule />

        {/* About section */}
        <EuiFlexGroup
          direction="row"
          gutterSize="xl"
          alignItems="flexStart"
          aria-labelledby="plugin-about-section"
        >
          <SectionHeader
            icon="document"
            titleId="plugin-about-section"
            title={labels.plugins.aboutSectionTitle}
            description={labels.plugins.aboutSectionDescription}
          />
          <EuiFlexItem grow={2}>
            <FieldRow label={labels.plugins.descriptionLabel}>
              {plugin.description ? (
                <p>{plugin.description}</p>
              ) : (
                <p>
                  <EuiText color="subdued" size="s">
                    &mdash;
                  </EuiText>
                </p>
              )}
            </FieldRow>
            <FieldRow label={labels.plugins.authorLabel}>
              {plugin.manifest.author?.name ? (
                <p>{plugin.manifest.author.name}</p>
              ) : (
                <p>
                  <EuiText color="subdued" size="s">
                    &mdash;
                  </EuiText>
                </p>
              )}
            </FieldRow>
            <FieldRow label={labels.plugins.sourceLabel}>
              {plugin.source_url ? (
                <EuiLink href={plugin.source_url} target="_blank" external>
                  {plugin.source_url}
                </EuiLink>
              ) : (
                <p>
                  <EuiText color="subdued" size="s">
                    &mdash;
                  </EuiText>
                </p>
              )}
            </FieldRow>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiHorizontalRule />

        {/* Skills section */}
        <EuiFlexGroup
          direction="row"
          gutterSize="xl"
          alignItems="flexStart"
          aria-labelledby="plugin-skills-section"
        >
          <SectionHeader
            icon="nested"
            titleId="plugin-skills-section"
            title={labels.plugins.skillsSectionTitle}
            description={labels.plugins.skillsSectionDescription}
          />
          <EuiFlexItem grow={2}>
            {plugin.skill_ids.length > 0 ? (
              <EuiFlexGroup direction="column" gutterSize="xs">
                {plugin.skill_ids.map((skillId) => (
                  <EuiFlexItem key={skillId} grow={false}>
                    <EuiLink
                      href={createAgentBuilderUrl(appPaths.skills.details({ skillId }))}
                      data-test-subj={`agentBuilderPluginSkillLink-${skillId}`}
                    >
                      {skillId}
                    </EuiLink>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            ) : (
              <EuiText size="s" color="subdued">
                {labels.plugins.noSkillsLabel}
              </EuiText>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
