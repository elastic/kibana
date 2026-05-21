/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Name & scope step — aligned with Observability Add data → AWS (Version 1 wizard). */

import React, { useEffect } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
  EuiLink,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  euiFontSize,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const DOC_FLEET_DATA_STREAMS = 'https://www.elastic.co/guide/en/fleet/current/data-streams.html';

export interface AwsCatalogNameScopeStepProps {
  readonly integrationName: string;
  readonly integrationDescription: string;
  readonly integrationNamespace: string;
  readonly onIntegrationNameChange: (value: string) => void;
  readonly onIntegrationDescriptionChange: (value: string) => void;
  readonly onIntegrationNamespaceChange: (value: string) => void;
  readonly onCanContinueChange: (canContinue: boolean) => void;
}

export const AwsCatalogNameScopeStep: React.FC<AwsCatalogNameScopeStepProps> = ({
  integrationName,
  integrationDescription,
  integrationNamespace,
  onIntegrationNameChange,
  onIntegrationDescriptionChange,
  onIntegrationNamespaceChange,
  onCanContinueChange,
}) => {
  const { euiTheme } = useEuiTheme();
  const euiThemeContext = useEuiTheme();
  const advancedAccordionId = useGeneratedHtmlId({ prefix: 'streamsAwsCatalogIntegrationAdvanced' });

  const canContinue = Boolean(integrationName.trim());

  useEffect(() => {
    onCanContinueChange(canContinue);
  }, [canContinue, onCanContinueChange]);

  useEffect(() => {
    return () => {
      onCanContinueChange(false);
    };
  }, [onCanContinueChange]);

  return (
    <div data-test-subj="streamsAwsCatalogNameScopeStep">
      <EuiText size="s" color="subdued">
        <p style={{ margin: 0 }}>
          {i18n.translate('xpack.streams.dataSources.awsNameScope.intro', {
            defaultMessage:
              'Add a name and description to identify this integration. Use advanced options to override the namespace used for data streams.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.streams.dataSources.awsNameScope.nameLabel', {
          defaultMessage: 'Name',
        })}
      >
        <EuiFieldText
          data-test-subj="streamsAwsCatalogConfigureIntegrationName"
          fullWidth
          value={integrationName}
          onChange={(e) => onIntegrationNameChange(e.target.value)}
          placeholder="cspm-1"
          autoComplete="off"
          spellCheck={false}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.streams.dataSources.awsNameScope.descriptionLabel', {
          defaultMessage: 'Description',
        })}
      >
        <EuiTextArea
          data-test-subj="streamsAwsCatalogConfigureIntegrationDescription"
          fullWidth
          value={integrationDescription}
          onChange={(e) => onIntegrationDescriptionChange(e.target.value)}
          rows={3}
          autoComplete="off"
          spellCheck
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiAccordion
        id={advancedAccordionId}
        data-test-subj="streamsAwsCatalogConfigureIntegrationAdvancedAccordion"
        borders="none"
        buttonElement="div"
        buttonProps={{ paddingSize: 's' as const }}
        buttonContent={
          <EuiLink
            color="primary"
            data-test-subj="streamsAwsCatalogConfigureIntegrationAdvancedOptionsLink"
            css={css`
              font-size: ${euiFontSize(euiThemeContext, 's').fontSize};
            `}
          >
            {i18n.translate('xpack.streams.dataSources.awsNameScope.advancedOptions', {
              defaultMessage: 'Advanced options',
            })}
          </EuiLink>
        }
        arrowProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        paddingSize="s"
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.streams.dataSources.awsNameScope.namespaceLabel', {
            defaultMessage: 'Namespace',
          })}
          helpText={
            <>
              {i18n.translate('xpack.streams.dataSources.awsNameScope.namespaceHelp', {
                defaultMessage:
                  'Overrides the default namespace from the parent agent policy and changes this integration’s data stream name.',
              })}{' '}
              <EuiLink
                data-test-subj="streamsAwsCatalogNamespaceLearnMoreLink"
                href={DOC_FLEET_DATA_STREAMS}
                target="_blank"
                external
              >
                {i18n.translate('xpack.streams.dataSources.awsNameScope.namespaceLearnMore', {
                  defaultMessage: 'Learn more',
                })}
              </EuiLink>
            </>
          }
        >
          <EuiFieldText
            data-test-subj="streamsAwsCatalogConfigureIntegrationNamespace"
            fullWidth
            value={integrationNamespace}
            onChange={(e) => onIntegrationNamespaceChange(e.target.value)}
            placeholder="default"
            autoComplete="off"
            spellCheck={false}
          />
        </EuiFormRow>
      </EuiAccordion>
    </div>
  );
};
