/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { Form, useForm, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { ActionConnector } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { CaseConnectorWithoutName } from '../../../../common/types/domain_zod/connector/v1';
import { NONE_CONNECTOR_ID } from '../../../../common/constants';
import { getConnectorById } from '../../utils';
import { Connector } from '../../case_form_fields/connector';
import { useGetSupportedActionConnectors } from '../../../containers/configure/use_get_supported_action_connectors';

interface Props {
  connector?: CaseConnectorWithoutName;
  onChange: (connector: CaseConnectorWithoutName) => void;
}

/**
 * Reads the inner hook_form_lib form data and lifts it up as a template connector
 * (`{ type, id, fields }`). `type` is resolved from the selected connector's `actionTypeId`; the
 * `.none` connector carries `null` fields.
 *
 * We subscribe to the whole form (no `watch` filter) because the connector's dynamic fields are
 * registered at nested paths (`fields.issueType`, `fields.priority`, …) that vary by connector
 * type — watching the `fields` parent path alone never reacts to those nested changes, which would
 * drop the additional fields on save. A serialized guard keeps `onChange` from firing on renders
 * that don't actually change the lifted connector.
 */
const ConnectorFormSync: React.FC<{
  connectors: ActionConnector[];
  onChange: (connector: CaseConnectorWithoutName) => void;
}> = ({ connectors, onChange }) => {
  const [formData] = useFormData();
  const connectorId = formData.connectorId as string | undefined;
  const fields = formData.fields as CaseConnectorWithoutName['fields'] | undefined;
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (connectorId == null) {
      return;
    }
    const actionTypeId =
      getConnectorById(connectorId, connectors)?.actionTypeId ?? ConnectorTypes.none;
    const next = {
      type: actionTypeId,
      id: connectorId,
      fields: actionTypeId === ConnectorTypes.none ? null : fields ?? null,
    } as CaseConnectorWithoutName;

    const serialized = JSON.stringify(next);
    if (serialized === lastSerializedRef.current) {
      return;
    }
    lastSerializedRef.current = serialized;
    onChange(next);
  }, [connectorId, fields, connectors, onChange]);

  return null;
};

ConnectorFormSync.displayName = 'ConnectorFormSync';

/**
 * Editable connector picker + the connector's native dynamic fields form, reused from the
 * create-case flow. It runs inside its own hook_form_lib form (a different form library than the
 * template editor's react-hook-form); changes are lifted to the parent via `onChange` and the
 * template editor serializes them into the definition YAML at submit time.
 */
export const TemplateConnectorForm: React.FC<Props> = ({ connector, onChange }) => {
  const { data: connectors = [], isLoading: isLoadingConnectors } =
    useGetSupportedActionConnectors();

  const { form } = useForm({
    defaultValue: {
      connectorId: connector?.id ?? NONE_CONNECTOR_ID,
      fields: connector?.fields ?? {},
    },
    options: { stripEmptyFields: false },
  });

  return (
    <Form form={form}>
      <ConnectorFormSync connectors={connectors} onChange={onChange} />
      <Connector
        connectors={connectors}
        isLoading={false}
        isLoadingConnectors={isLoadingConnectors}
      />
    </Form>
  );
};

TemplateConnectorForm.displayName = 'TemplateConnectorForm';
