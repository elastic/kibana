/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { GenerateConnectorTypeErrorReason } from '../../../../../common/connector_type_generation';
import { useGenerateConnectorType } from '../../../hooks/use_generate_connector_type';
import { fetchConnectorTypeLogo } from '../../../lib/action_connector_api';
import { useKibana } from '../../../../common/lib/kibana';

interface Props {
  onApply: (connectorType: Partial<CreateConnectorTypeRequest> & { logoUrl?: string }) => void;
  isDisabled?: boolean;
}

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
};

const getErrorGuidance = (reason?: GenerateConnectorTypeErrorReason): string | undefined => {
  switch (reason) {
    case 'no_model':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.aiNoModelGuidance',
        {
          defaultMessage:
            'Set a default AI connector, or pick a model for Connector type builder in Feature Settings.',
        }
      );
    case 'blocked_destination':
    case 'invalid_url':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.aiPublicUrlGuidance',
        { defaultMessage: 'Use a public https documentation URL.' }
      );
    case 'unsupported_content':
    case 'too_large':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.aiSinglePageGuidance',
        { defaultMessage: 'Link to a single HTML or text page.' }
      );
    case 'invalid_output':
    case 'model_error':
      return i18n.translate('xpack.triggersActionsUI.sections.buildConnectorPage.aiRetryGuidance', {
        defaultMessage: 'Try again or another page, then edit the form by hand.',
      });
    case 'fetch_failed':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorPage.aiFetchFailedGuidance',
        { defaultMessage: 'Check the URL and try again.' }
      );
    default:
      return undefined;
  }
};

const AiAssistantPanelComponent: React.FC<Props> = ({ onApply, isDisabled = false }) => {
  const { http } = useKibana().services;
  const [url, setUrl] = useState('');
  const { isLoading, generateConnectorTypeError, generateConnectorType } =
    useGenerateConnectorType();
  const trimmedUrl = url.trim();
  const urlIsInvalid = trimmedUrl.length > 0 && !isHttpUrl(trimmedUrl);
  const canGenerate = isHttpUrl(trimmedUrl) && !isDisabled && !isLoading;
  const guidance = getErrorGuidance(generateConnectorTypeError?.reason);

  const onGenerate = useCallback(async () => {
    const result = await generateConnectorType(trimmedUrl);
    if (result) {
      const { connectorType } = result;
      const fallbackUrl = new URL('/favicon.ico', result.documentUrl ?? trimmedUrl).toString();
      const candidates =
        result.logoUrl && result.logoUrl !== fallbackUrl
          ? [result.logoUrl, fallbackUrl]
          : [fallbackUrl];
      let icon: string | undefined;
      let logoUrl: string | undefined;
      for (const candidate of candidates) {
        try {
          const logo = await fetchConnectorTypeLogo({ http, url: candidate });
          icon = logo.icon;
          logoUrl = candidate;
          break;
        } catch {
          // Try the conventional favicon path if the page's icon link cannot be loaded.
        }
      }
      onApply(icon && logoUrl ? { ...connectorType, icon, logoUrl } : connectorType);
    }
  }, [generateConnectorType, http, onApply, trimmedUrl]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorPage.aiUrlFieldLabel',
          { defaultMessage: 'Documentation URL' }
        )}
        fullWidth
        isInvalid={urlIsInvalid}
        error={
          urlIsInvalid
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorPage.aiUrlFieldError',
                { defaultMessage: 'Enter an http or https URL.' }
              )
            : undefined
        }
      >
        <EuiFieldText
          isInvalid={urlIsInvalid}
          fullWidth
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          disabled={isDisabled || isLoading}
          data-test-subj="build-connector-ai-url"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            color="primary"
            onClick={onGenerate}
            isLoading={isLoading}
            isDisabled={!canGenerate}
            data-test-subj="build-connector-ai-generate-btn"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorPage.aiGenerateButtonLabel',
              { defaultMessage: 'Generate draft' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {generateConnectorTypeError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            data-test-subj="build-connector-ai-error"
            title={generateConnectorTypeError.title}
            text={
              generateConnectorTypeError.reason === 'no_model' && guidance ? (
                guidance
              ) : (
                <>
                  <p>{generateConnectorTypeError.message}</p>
                  {guidance ? <p>{guidance}</p> : null}
                </>
              )
            }
          />
        </>
      )}
    </>
  );
};

export const AiAssistantPanel = memo(AiAssistantPanelComponent);
