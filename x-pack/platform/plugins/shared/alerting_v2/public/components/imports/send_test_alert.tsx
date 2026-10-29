/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useTestImport } from '../../hooks/use_test_import';
import { parseImportRequestError } from './custom_import_form';
import { ViewAlertsLink } from './view_alerts_link';

interface SendTestAlertProps {
  importId: string;
  disabled?: boolean;
  /** Called once the workflow run was started, so the host can refresh its stats. */
  onSent?: () => void;
}

/**
 * POC: runs the import's workflow once with a sample payload. This writes a real alert, so the
 * button says so.
 */
export const SendTestAlert = ({ importId, disabled = false, onSent }: SendTestAlertProps) => {
  const { mutate, isLoading, isSuccess, isError, error, reset } = useTestImport();

  return (
    <div data-test-subj="importsSendTestAlert">
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="play"
            isLoading={isLoading}
            isDisabled={disabled}
            onClick={() => {
              reset();
              mutate(importId, { onSuccess: () => onSent?.() });
            }}
            data-test-subj="importsSendTestAlertButton"
          >
            {i18n.translate('xpack.alertingV2.imports.sendTestAlert.button', {
              defaultMessage: 'Send test alert (creates a real alert)',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {isSuccess && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="success" data-test-subj="importsSendTestAlertSuccess">
            <p>
              <FormattedMessage
                id="xpack.alertingV2.imports.sendTestAlert.success"
                defaultMessage="Test alert sent. It shows up in {alertsLink} within a few seconds."
                values={{
                  alertsLink: (
                    <ViewAlertsLink importId={importId}>
                      {i18n.translate('xpack.alertingV2.imports.sendTestAlert.alertsLink', {
                        defaultMessage: 'the alerts list',
                      })}
                    </ViewAlertsLink>
                  ),
                }}
              />
            </p>
          </EuiText>
        </>
      )}
      {isError && (
        <>
          <EuiSpacer size="s" />
          <KbnDangerCallout
            announceOnMount
            size="s"
            data-test-subj="importsSendTestAlertError"
            title={i18n.translate('xpack.alertingV2.imports.sendTestAlert.errorTitle', {
              defaultMessage: 'The test alert could not be sent',
            })}
            text={parseImportRequestError(error).message}
          />
        </>
      )}
    </div>
  );
};
