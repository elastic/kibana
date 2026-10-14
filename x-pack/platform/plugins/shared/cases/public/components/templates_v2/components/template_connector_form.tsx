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
 * Lifts the inner hook_form_lib form data up as a template connector (`{ type, id, fields }`; `.none`
 * carries `null` fields). Subscribes to the whole form (no `watch` filter) because dynamic fields
 * live at nested paths (`fields.issueType`, …) that a `fields`-only watch wouldn't react to. A
 * serialized guard stops `onChange` firing when the lifted connector hasn't actually changed.
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
 * Editable connector picker + native dynamic fields form, reused from the create-case flow. Runs in
 * its own hook_form_lib form (separate from the editor's react-hook-form); changes are lifted via
 * `onChange` and serialized into the definition YAML on submit.
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
