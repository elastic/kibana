/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { memo, Suspense } from 'react';

import { EuiTitle, EuiSpacer, EuiErrorBoundary } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorFormFieldsGlobal } from './connector_form_fields_global';

interface ConnectorFormFieldsProps {
  actionTypeModel: ActionTypeModel | null;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
  authMode?: 'shared' | 'per-user';
  /** Optional content rendered under Connector settings (e.g. inbound webhook URL). */
  settingsContent?: ReactNode;
}

const ConnectorFormFieldsComponent: React.FC<ConnectorFormFieldsProps> = ({
  actionTypeModel,
  isEdit,
  registerPreSubmitValidator,
  authMode,
  settingsContent,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);
  const FieldsComponent = actionTypeModel?.actionConnectorFields ?? null;
  const showSettingsSection = FieldsComponent !== null || settingsContent != null;
  const showSettingsTitle =
    settingsContent != null || !Boolean(actionTypeModel?.connectorForm?.hideSettingsTitle);

  return (
    <>
      <ConnectorFormFieldsGlobal canSave={canSave} isEdit={isEdit} />
      <EuiSpacer size="m" />
      {showSettingsSection ? (
        <>
          {showSettingsTitle ? (
            <>
              <EuiTitle size="xxs" data-test-subj="connector-settings-label">
                <h4>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.actionConnectorForm.connectorSettingsLabel"
                    defaultMessage="Connector settings"
                  />
                </h4>
              </EuiTitle>
              <EuiSpacer size="s" />
            </>
          ) : null}
          {settingsContent}
          {FieldsComponent !== null ? (
            <EuiErrorBoundary>
              <Suspense
                fallback={
                  <SectionLoading>
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.actionConnectorForm.loadingConnectorSettingsDescription"
                      defaultMessage="Loading connector settings…"
                    />
                  </SectionLoading>
                }
              >
                <FieldsComponent
                  readOnly={!canSave}
                  isEdit={isEdit}
                  registerPreSubmitValidator={registerPreSubmitValidator}
                  authMode={authMode}
                />
              </Suspense>
            </EuiErrorBoundary>
          ) : null}
        </>
      ) : null}
    </>
  );
};

export const ConnectorFormFields = memo(ConnectorFormFieldsComponent);
