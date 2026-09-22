/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldPassword,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AwsStaticKeyCredentials } from '@kbn/fleet-plugin/public';

function HiddenFieldPanel({
  varName,
  onReplace,
  dataTestSubj,
}: {
  varName: string;
  onReplace: () => void;
  dataTestSubj?: string;
}) {
  return (
    <EuiPanel color="subdued" borderRadius="none" hasShadow={false}>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ingestHub.staticKeysReplaceView.hiddenMessage"
          defaultMessage="The saved {varName} is hidden. You can only replace the {varName}."
          values={{ varName }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        onClick={onReplace}
        color="primary"
        iconType="refresh"
        iconSide="left"
        size="xs"
        data-test-subj={dataTestSubj}
      >
        <FormattedMessage
          id="xpack.ingestHub.staticKeysReplaceView.replaceButton"
          defaultMessage="Replace {varName}"
          values={{ varName }}
        />
      </EuiButtonEmpty>
    </EuiPanel>
  );
}

function CancelButton({ varName, onCancel }: { varName: string; onCancel: () => void }) {
  return (
    <EuiButtonEmpty onClick={onCancel} color="primary" iconType="refresh" iconSide="left" size="xs">
      <FormattedMessage
        id="xpack.ingestHub.staticKeysReplaceView.cancelButton"
        defaultMessage="Cancel {varName} change"
        values={{ varName }}
      />
    </EuiButtonEmpty>
  );
}

/**
 * Shown in edit mode (resume with ?deploymentId=) when the deployment used static keys.
 * Both fields start hidden — matching Fleet's SecretFormRow UX (subdued panel + refresh button).
 * Neither credential is persisted; both must be re-entered to re-deploy.
 *
 * TODO: There is currently no way to redeploy managed integrations with new static keys.
 * The Deploy button is not shown in edit mode once the deployment succeeded; a new credentials
 * entry here has nowhere to go. Tracked in ingest-dev#9424.
 */
export function StaticKeysReplaceView({
  onReadyChange,
  onFieldsChange,
}: {
  onReadyChange: (isReady: boolean) => void;
  onFieldsChange: (fields: AwsStaticKeyCredentials | undefined) => void;
}) {
  const [isReplacingAKID, setIsReplacingAKID] = useState(false);
  const [newAKID, setNewAKID] = useState('');
  const [isReplacingSecret, setIsReplacingSecret] = useState(false);
  const [newSecret, setNewSecret] = useState('');

  useEffect(() => {
    const isReady = isReplacingAKID && !!newAKID && isReplacingSecret && !!newSecret;
    onReadyChange(isReady);
    if (isReady) {
      onFieldsChange({ access_key_id: newAKID, secret_access_key: newSecret });
    }
  }, [isReplacingAKID, newAKID, isReplacingSecret, newSecret, onReadyChange, onFieldsChange]);

  const accessKeyIdLabel = i18n.translate(
    'xpack.ingestHub.staticKeysReplaceView.accessKeyIdLabel',
    { defaultMessage: 'Access key ID' }
  );
  const secretAccessKeyLabel = i18n.translate(
    'xpack.ingestHub.staticKeysReplaceView.secretAccessKeyLabel',
    { defaultMessage: 'Secret access key' }
  );

  return (
    <>
      <EuiFormRow label={accessKeyIdLabel} fullWidth>
        {isReplacingAKID ? (
          <>
            <EuiFieldText
              fullWidth
              value={newAKID}
              onChange={(e) => setNewAKID(e.target.value)}
              data-test-subj="staticKeysReplace-accessKeyId"
            />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <CancelButton
                  varName={accessKeyIdLabel}
                  onCancel={() => {
                    setIsReplacingAKID(false);
                    setNewAKID('');
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <HiddenFieldPanel
            varName={accessKeyIdLabel}
            onReplace={() => setIsReplacingAKID(true)}
            dataTestSubj="staticKeysReplace-accessKeyId-toggle"
          />
        )}
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label={secretAccessKeyLabel} fullWidth>
        {isReplacingSecret ? (
          <>
            <EuiFieldPassword
              fullWidth
              value={newSecret}
              onChange={(e) => setNewSecret(e.target.value)}
              data-test-subj="staticKeysReplace-secretAccessKey"
            />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <CancelButton
                  varName={secretAccessKeyLabel}
                  onCancel={() => {
                    setIsReplacingSecret(false);
                    setNewSecret('');
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        ) : (
          <HiddenFieldPanel
            varName={secretAccessKeyLabel}
            onReplace={() => setIsReplacingSecret(true)}
            dataTestSubj="staticKeysReplace-secretAccessKey-toggle"
          />
        )}
      </EuiFormRow>
    </>
  );
}
