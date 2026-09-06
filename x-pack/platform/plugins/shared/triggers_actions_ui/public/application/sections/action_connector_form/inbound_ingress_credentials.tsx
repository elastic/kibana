/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiConfirmModal,
  EuiCopy,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useInboundEventsUrl } from '../../hooks/use_inbound_events_url';
import { useRotateInboundIngress } from '../../hooks/use_rotate_inbound_ingress';
import { getInboundIngestToken } from '../../lib/inbound_ingress';
import type { ActionConnector } from '../../../types';

interface CopyableFieldProps {
  label: string;
  value: string;
  helpText?: React.ReactNode;
  'data-test-subj': string;
  copyAriaLabel: string;
}

const CopyableField: React.FC<CopyableFieldProps> = ({
  label,
  value,
  helpText,
  'data-test-subj': dataTestSubj,
  copyAriaLabel,
}) => (
  <EuiFormRow label={label} helpText={helpText} fullWidth>
    <EuiCopy
      textToCopy={value}
      beforeMessage={copyAriaLabel}
      tooltipProps={{
        disableScreenReaderOutput: true,
        anchorClassName: 'eui-displayBlock',
      }}
    >
      {(copy) => (
        <EuiFieldText
          readOnly
          fullWidth
          value={value}
          data-test-subj={dataTestSubj}
          icon={{
            type: 'copy',
            side: 'right',
            onClick: copy,
            'aria-label': copyAriaLabel,
            'data-test-subj': `${dataTestSubj}-copy`,
          }}
        />
      )}
    </EuiCopy>
  </EuiFormRow>
);

export interface InboundIngressCredentialsProps {
  connector: ActionConnector;
  allowRotate?: boolean;
}

const InboundIngressCredentialsComponent: React.FC<InboundIngressCredentialsProps> = ({
  connector,
  allowRotate = false,
}) => {
  const { url: webhookUrl, isPublicBaseUrlConfigured } = useInboundEventsUrl(
    connector.actionTypeId,
    connector.id
  );
  const initialToken = getInboundIngestToken(connector);
  const [ingestToken, setIngestToken] = useState<string | undefined>(initialToken);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const { isLoading: isRotating, rotateIngress } = useRotateInboundIngress();
  const rotateConfirmTitleId = useGeneratedHtmlId();

  const onConfirmRotate = useCallback(async () => {
    try {
      const rotated = await rotateIngress(connector.id);
      setIngestToken(rotated.ingestToken);
    } catch {
      // Danger toast is shown by the rotate hook.
    } finally {
      setShowRotateConfirm(false);
    }
  }, [connector.id, rotateIngress]);

  return (
    <div data-test-subj="inbound-ingress-credentials">
      {ingestToken !== undefined && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            data-test-subj="inbound-ingress-token-warning"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.inboundIngress.copyTokenNowTitle',
              {
                defaultMessage: 'Copy this ingest token now',
              }
            )}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.inboundIngress.copyTokenNowDescription"
              defaultMessage="You will not be able to view it again. Store it with the webhook URL; the token authenticates inbound requests."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      {!isPublicBaseUrlConfigured && (
        <>
          <EuiCallOut
            announceOnMount
            color="warning"
            iconType="warning"
            data-test-subj="inbound-ingress-public-base-url-warning"
            title={i18n.translate(
              'xpack.triggersActionsUI.sections.inboundIngress.publicBaseUrlMissingTitle',
              {
                defaultMessage: 'server.publicBaseUrl is not set',
              }
            )}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.inboundIngress.publicBaseUrlMissingDescription"
              defaultMessage="This webhook path is relative and may not be reachable by external services. Set server.publicBaseUrl to show an absolute URL."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}

      <CopyableField
        label={i18n.translate('xpack.triggersActionsUI.sections.inboundIngress.webhookUrlLabel', {
          defaultMessage: 'Webhook URL',
        })}
        value={webhookUrl}
        helpText={
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.inboundIngress.webhookUrlHelpText"
            defaultMessage="POST JSON to this URL. Authenticate with {authHeader} or the {tokenQuery} query parameter."
            values={{
              authHeader: <strong>{'Authorization: Bearer <token>'}</strong>,
              tokenQuery: <strong>token</strong>,
            }}
          />
        }
        data-test-subj="inbound-ingress-webhook-url"
        copyAriaLabel={i18n.translate(
          'xpack.triggersActionsUI.sections.inboundIngress.copyWebhookUrlAriaLabel',
          { defaultMessage: 'Copy webhook URL' }
        )}
      />

      {ingestToken !== undefined ? (
        <CopyableField
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.ingestTokenLabel',
            { defaultMessage: 'Ingest token' }
          )}
          value={ingestToken}
          data-test-subj="inbound-ingress-ingest-token"
          copyAriaLabel={i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.copyIngestTokenAriaLabel',
            { defaultMessage: 'Copy ingest token' }
          )}
        />
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="inbound-ingress-token-hidden">
          <p>
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.inboundIngress.tokenHiddenDescription"
              defaultMessage="The ingest token is shown only when it is created or rotated. Rotating invalidates the current token immediately."
            />
          </p>
        </EuiText>
      )}

      {allowRotate && (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            color="warning"
            data-test-subj="inbound-ingress-rotate-btn"
            isLoading={isRotating}
            onClick={() => setShowRotateConfirm(true)}
          >
            <FormattedMessage
              id="xpack.triggersActionsUI.sections.inboundIngress.rotateButtonLabel"
              defaultMessage="Rotate ingest token"
            />
          </EuiButton>
        </>
      )}

      {showRotateConfirm && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.rotateConfirmTitle',
            { defaultMessage: 'Rotate ingest token?' }
          )}
          aria-labelledby={rotateConfirmTitleId}
          titleProps={{ id: rotateConfirmTitleId }}
          onCancel={() => setShowRotateConfirm(false)}
          onConfirm={onConfirmRotate}
          cancelButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.rotateConfirmCancelButtonLabel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.triggersActionsUI.sections.inboundIngress.rotateConfirmButtonLabel',
            { defaultMessage: 'Rotate token' }
          )}
          buttonColor="warning"
          defaultFocusedButton="confirm"
          confirmButtonDisabled={isRotating}
          data-test-subj="inbound-ingress-rotate-confirm"
        >
          <FormattedMessage
            id="xpack.triggersActionsUI.sections.inboundIngress.rotateConfirmDescription"
            defaultMessage="The current ingest token will stop working immediately. Copy the new token after rotation; you will not be able to view it again."
          />
        </EuiConfirmModal>
      )}
    </div>
  );
};

export const InboundIngressCredentials = memo(InboundIngressCredentialsComponent);
