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
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import type { DynamicConnectorType } from '../../../lib/action_connector_api/dynamic_connector_types';
import { AiAssistantPanel } from './ai_assistant_panel';
import { YamlImportPanel } from './yaml_import_panel';

interface Props {
  onApply: (definition: Partial<CreateConnectorTypeRequest>) => void;
  onStartFromScratch: () => void;
  dynamicConnectorTypes: DynamicConnectorType[];
  dynamicConnectorTypesLoading: boolean;
  dynamicConnectorTypesError?: string;
  onRetryDynamicConnectorTypes: () => void;
  onEdit: (connectorType: DynamicConnectorType) => void;
  editingDefinitionLoading?: boolean;
}

export const BuildConnectorStart: React.FC<Props> = ({
  onApply,
  onStartFromScratch,
  dynamicConnectorTypes,
  dynamicConnectorTypesLoading,
  dynamicConnectorTypesError,
  onRetryDynamicConnectorTypes,
  onEdit,
  editingDefinitionLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const [showYamlImport, setShowYamlImport] = useState(false);

  const iconBadgeStyles = css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: ${euiTheme.size.xxl};
    height: ${euiTheme.size.xxl};
    border-radius: ${euiTheme.border.radius.medium};
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const dividerStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.m};
    color: ${euiTheme.colors.textSubdued};
    &::before,
    &::after {
      content: '';
      flex: 1;
      border-top: ${euiTheme.border.thin};
    }
  `;

  return (
    <EuiPageTemplate.Section
      grow={false}
      paddingSize="none"
      restrictWidth={720}
      css={css`
        padding-block: ${euiTheme.size.xxl};
      `}
      data-test-subj="build-connector-start"
    >
      <EuiPanel hasBorder paddingSize="xl">
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <div css={iconBadgeStyles}>
              <EuiIcon type="sparkles" size="l" color="primary" aria-hidden={true} />
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiTitle size="m">
                  <h2>
                    {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.aiTitle', {
                      defaultMessage: 'Generate with AI',
                    })}
                  </h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">
                  {i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.aiRecommended',
                    { defaultMessage: 'Recommended' }
                  )}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.aiIntro', {
                defaultMessage:
                  'Enter a public API documentation URL. Review the draft before saving.',
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="xl" />
        <AiAssistantPanel onApply={onApply} />
      </EuiPanel>
      <EuiSpacer size="xl" />
      <EuiText size="xs" css={dividerStyles}>
        {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.orDivider', {
          defaultMessage: 'or start another way',
        })}
      </EuiText>
      <EuiSpacer size="xl" />
      <EuiFlexGroup gutterSize="l" responsive>
        <EuiFlexItem>
          <EuiCard
            hasBorder
            layout="horizontal"
            icon={<EuiIcon type="document" size="l" aria-hidden={true} />}
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.importYaml',
              {
                defaultMessage: 'Import YAML',
              }
            )}
            titleSize="xs"
            description={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.importYamlDescription',
              { defaultMessage: 'Paste or upload an existing connector definition.' }
            )}
            onClick={() => setShowYamlImport((current) => !current)}
            data-test-subj="build-connector-start-import-yaml"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            hasBorder
            layout="horizontal"
            icon={<EuiIcon type="pencil" size="l" aria-hidden={true} />}
            title={i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.scratch', {
              defaultMessage: 'Start from scratch',
            })}
            titleSize="xs"
            description={i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.scratchDescription',
              { defaultMessage: 'Define actions, auth, and fields manually.' }
            )}
            onClick={onStartFromScratch}
            data-test-subj="build-connector-start-scratch"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {showYamlImport && (
        <>
          <EuiSpacer size="l" />
          <EuiPanel hasBorder paddingSize="xl" data-test-subj="build-connector-start-yaml">
            <EuiTitle size="s">
              <h3>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorPage.importYamlTitle',
                  { defaultMessage: 'Import YAML' }
                )}
              </h3>
            </EuiTitle>
            <EuiSpacer size="m" />
            <YamlImportPanel onApply={onApply} />
          </EuiPanel>
        </>
      )}
      {(dynamicConnectorTypesLoading ||
        dynamicConnectorTypesError ||
        dynamicConnectorTypes.length > 0) && (
        <>
          <EuiSpacer size="xl" />
          <section data-test-subj="created-types-section">
            <EuiTitle size="s">
              <h2>
                {i18n.translate(
                  'xpack.triggersActionsUI.sections.buildConnectorPage.createdTypesTitle',
                  { defaultMessage: 'Created connector types' }
                )}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiPanel hasBorder paddingSize="m">
              {dynamicConnectorTypesLoading ? (
                <EuiLoadingSpinner
                  size="m"
                  aria-label={i18n.translate(
                    'xpack.triggersActionsUI.sections.buildConnectorPage.loadingTypes',
                    { defaultMessage: 'Loading connector types' }
                  )}
                />
              ) : dynamicConnectorTypesError ? (
                <>
                  <KbnDangerCallout
                    announceOnMount
                    size="s"
                    title={dynamicConnectorTypesError}
                    data-test-subj="created-types-error"
                  />
                  <EuiSpacer size="s" />
                  <EuiButton
                    size="s"
                    onClick={onRetryDynamicConnectorTypes}
                    data-test-subj="created-types-retry"
                  >
                    {i18n.translate(
                      'xpack.triggersActionsUI.sections.buildConnectorPage.retryTypes',
                      {
                        defaultMessage: 'Retry',
                      }
                    )}
                  </EuiButton>
                </>
              ) : (
                <EuiFlexGroup direction="column" gutterSize="s">
                  {dynamicConnectorTypes.map((connectorType) => (
                    <EuiFlexItem key={connectorType.id}>
                      <EuiFlexGroup alignItems="center" responsive={false}>
                        <EuiFlexItem>
                          <EuiText>
                            <strong>{connectorType.name}</strong> <span>({connectorType.id})</span>
                          </EuiText>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            size="s"
                            isLoading={editingDefinitionLoading}
                            isDisabled={editingDefinitionLoading}
                            onClick={() => onEdit(connectorType)}
                            data-test-subj={`edit-dynamic-connector-${connectorType.id}`}
                          >
                            {i18n.translate(
                              'xpack.triggersActionsUI.sections.buildConnectorPage.editType',
                              { defaultMessage: 'Edit' }
                            )}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              )}
            </EuiPanel>
          </section>
        </>
      )}
    </EuiPageTemplate.Section>
  );
};
