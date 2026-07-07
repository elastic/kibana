/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { z } from '@kbn/zod/v4';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type {
  CaseConnector,
  CaseSettings,
  ConnectorTypeFields,
} from '../../../common/types/domain';
import { ConnectorTypes } from '../../../common/types/domain';
import type { CaseConnectorWithoutName } from '../../../common/types/domain_zod/connector/v1';
import type { TemplateSettings } from '../../../common/types/domain/template/v1';
import type { CaseUI } from '../../../common';
import { getNoneConnector } from '../../../common/utils/connectors';
import type { FieldSchema } from '../../../common/types/domain/template/fields';
import { isInlineField } from '../../../common/types/domain/template/fields';
import { patchCase } from '../../containers/api';
import { casesMutationsKeys } from '../../containers/constants';
import { useCasesToast } from '../../common/use_cases_toast';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import type { ServerError } from '../../types';
import type { CaseActionConnector } from '../types';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils';
import { getConnectorById } from '../utils';
import { normalizeActionConnector } from '../configure_cases/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';
import { useRefreshCaseViewPage } from './use_on_refresh_case_view_page';
import * as i18n from './translations';

type Field = z.infer<typeof FieldSchema>;

/**
 * A template's raw definition values as passed to {@link useChangeAppliedTemplate}. `connector` /
 * `settings` are unresolved (the hook resolves the connector and applies create-flow defaults).
 * `null` removes the applied template.
 */
export type NewAppliedTemplate = {
  id: string;
  version: number;
  fields: Field[];
  connector?: CaseConnectorWithoutName;
  settings?: TemplateSettings;
} | null;

interface ChangeAppliedTemplateArgs {
  caseData: CaseUI;
  /**
   * Pass null to remove the applied template. `connector` / `settings` are the template's raw
   * definition values; the hook resolves the connector and applies the same defaults as create.
   */
  newTemplate: NewAppliedTemplate;
  /**
   * When provided, this fully-resolved connector is written to the case instead of the one resolved
   * from `newTemplate.connector`. Callers use it to retain the case's existing connector after the
   * user declines a connector change on an already-pushed case (see the connector-change guard).
   */
  connectorOverride?: CaseConnector;
}

/**
 * Resolves a template's default connector (`type` + `id` + raw `fields`) into a full case connector.
 * Falls back to `.none` when the template declares no connector or its `id` no longer resolves to a
 * connector of the same type (deleted / unauthorized / other space), mirroring the create flow.
 */
export const resolveTemplateConnector = (
  connector: CaseConnectorWithoutName | undefined,
  connectors: CaseActionConnector[]
): CaseConnector => {
  if (!connector || connector.type === ConnectorTypes.none) {
    return getNoneConnector();
  }
  const actionConnector = getConnectorById(connector.id, connectors);
  if (!actionConnector || actionConnector.actionTypeId !== connector.type) {
    return getNoneConnector();
  }
  return normalizeActionConnector(
    actionConnector,
    (connector.fields ?? null) as ConnectorTypeFields['fields']
  );
};

/**
 * A template is authoritative for the case's settings: keys it declares are applied and keys it
 * omits (or a template with no settings block) default to off, matching the create flow.
 */
const buildTemplateSettings = (settings: TemplateSettings | undefined): CaseSettings => ({
  syncAlerts: settings?.syncAlerts ?? false,
  extractObservables: settings?.extractObservables ?? false,
});

export const computeNewExtendedFields = (
  newTemplateFields: Field[],
  currentExtendedFields: Record<string, unknown>
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const field of newTemplateFields) {
    if (isInlineField(field)) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      const existingValue = currentExtendedFields[camelKey];
      if (existingValue !== undefined && existingValue !== '') {
        result[snakeKey] = String(existingValue);
      } else {
        result[snakeKey] = getYamlDefaultAsString(field.metadata?.default);
      }
    }
  }
  return result;
};

export const useChangeAppliedTemplate = () => {
  const { showErrorToast, showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  // Needed to resolve a template's default connector `id` to a full case connector (and fall back to
  // `.none` when it no longer exists). The case view already loads these, so the cache is warm.
  const { data: connectors = [] } = useGetSupportedActionConnectors();

  return useMutation(
    ({ caseData, newTemplate, connectorOverride }: ChangeAppliedTemplateArgs) => {
      const newExtendedFields = newTemplate
        ? computeNewExtendedFields(newTemplate.fields, caseData.extendedFields ?? {})
        : {};
      return patchCase({
        caseId: caseData.id,
        updatedCase: {
          template: newTemplate ? { id: newTemplate.id, version: newTemplate.version } : null,
          [CASE_EXTENDED_FIELDS]: newExtendedFields,
          // The applied template owns the connector and settings; a template that declares neither
          // (or removing the template) resets them to `.none` / off so the case matches the template.
          // `connectorOverride` wins when the caller chose to retain the case's existing connector.
          connector:
            connectorOverride ?? resolveTemplateConnector(newTemplate?.connector, connectors),
          settings: buildTemplateSettings(newTemplate?.settings),
        },
        version: caseData.version,
      });
    },
    {
      mutationKey: casesMutationsKeys.changeAppliedTemplate,
      onSuccess: () => {
        refreshCaseViewPage();
        showSuccessToast(i18n.TEMPLATE_CHANGED_SUCCESSFULLY);
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_CHANGING_TEMPLATE });
      },
    }
  );
};
