/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, Suspense, useMemo } from 'react';

import { EuiTitle, EuiSpacer, EuiErrorBoundary } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ActionTypeModel, ConnectorValidationFunc } from '../../../types';
import { SectionLoading } from '../../components/section_loading';
import { hasSaveActionsCapability } from '../../lib/capabilities';
import { useKibana } from '../../../common/lib/kibana';
import { ConnectorFormFieldsGlobal } from './connector_form_fields_global';
import { connectorOverrides } from './connector_overrides';

interface ConnectorFormFieldsProps {
  actionTypeModel: ActionTypeModel | null;
  isEdit: boolean;
  registerPreSubmitValidator: (validator: ConnectorValidationFunc) => void;
}

const ConnectorFormFieldsComponent: React.FC<ConnectorFormFieldsProps> = ({
  actionTypeModel,
  isEdit,
  registerPreSubmitValidator,
}) => {
  const {
    application: { capabilities },
  } = useKibana().services;
  const canSave = hasSaveActionsCapability(capabilities);
  const FieldsComponent = actionTypeModel?.actionConnectorFields ?? null;
  const overrides = useMemo(() => {
    if (actionTypeModel) {
      return connectorOverrides(actionTypeModel.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionTypeModel?.id]);

  return (
    <>
      <ConnectorFormFieldsGlobal canSave={canSave} />
      <EuiSpacer size="m" />
      {FieldsComponent !== null ? (
        <>
          {overrides?.shouldHideConnectorSettingsTitle ? null : (
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
          )}
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
              />
            </Suspense>
          </EuiErrorBoundary>
        </>
      ) : null}
    </>
  );
};

export const ConnectorFormFields = memo(ConnectorFormFieldsComponent);
