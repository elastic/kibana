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
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { GenerateConnectorTypeErrorReason } from '../../../../../common/connector_type_generation';
import { useGenerateConnectorType } from '../../../hooks/use_generate_connector_type';

interface Props {
  onApply: (connectorType: Partial<CreateConnectorTypeRequest>) => void;
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
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiNoModelGuidance',
        {
          defaultMessage:
            'Set a default AI connector, or pick a model for Connector builder in Feature Settings.',
        }
      );
    case 'blocked_destination':
    case 'invalid_url':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiPublicUrlGuidance',
        { defaultMessage: 'Use a public https documentation URL.' }
      );
    case 'unsupported_content':
    case 'too_large':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiSinglePageGuidance',
        { defaultMessage: 'Link to a single HTML or text page.' }
      );
    case 'invalid_output':
    case 'model_error':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiRetryGuidance',
        {
          defaultMessage: 'Try again or another page, then edit the form by hand.',
        }
      );
    case 'fetch_failed':
      return i18n.translate(
        'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiFetchFailedGuidance',
        { defaultMessage: 'Check the URL and try again.' }
      );
    default:
      return undefined;
  }
};

const AiAssistantPanelComponent: React.FC<Props> = ({ onApply, isDisabled = false }) => {
  const [url, setUrl] = useState('');
  const [didApply, setDidApply] = useState(false);
  const { isLoading, generateConnectorTypeError, generateConnectorType } =
    useGenerateConnectorType();
  const trimmedUrl = url.trim();
  const urlIsInvalid = trimmedUrl.length > 0 && !isHttpUrl(trimmedUrl);
  const canGenerate = isHttpUrl(trimmedUrl) && !isDisabled && !isLoading;
  const guidance = getErrorGuidance(generateConnectorTypeError?.reason);

  const onGenerate = useCallback(async () => {
    setDidApply(false);
    const connectorType = await generateConnectorType(trimmedUrl);
    if (connectorType) {
      onApply(connectorType);
      setDidApply(true);
    }
  }, [generateConnectorType, onApply, trimmedUrl]);

  return (
    <>
      <EuiFormRow
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiUrlFieldLabel',
          { defaultMessage: 'Documentation URL' }
        )}
        helpText={i18n.translate(
          'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiUrlFieldHelpText',
          { defaultMessage: 'Fills the form without saving.' }
        )}
        fullWidth
        isInvalid={urlIsInvalid}
        error={
          urlIsInvalid
            ? i18n.translate(
                'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiUrlFieldError',
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
          data-test-subj="build-connector-flyout-ai-url"
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={onGenerate}
            isLoading={isLoading}
            isDisabled={!canGenerate}
            data-test-subj="build-connector-flyout-ai-generate-btn"
          >
            {i18n.translate(
              'xpack.triggersActionsUI.sections.buildConnectorFlyout.aiGenerateButtonLabel',
              { defaultMessage: 'Generate' }
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
            data-test-subj="build-connector-flyout-ai-error"
            title={generateConnectorTypeError.title}
            text={
              <>
                <p>{generateConnectorTypeError.message}</p>
                {guidance ? <p>{guidance}</p> : null}
              </>
            }
          />
        </>
      )}
      {didApply && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued" data-test-subj="build-connector-flyout-ai-success">
            {i18n.translate('xpack.triggersActionsUI.sections.buildConnectorFlyout.aiSuccessHint', {
              defaultMessage: 'Review the draft before saving.',
            })}
          </EuiText>
        </>
      )}
    </>
  );
};

export const AiAssistantPanel = memo(AiAssistantPanelComponent);
