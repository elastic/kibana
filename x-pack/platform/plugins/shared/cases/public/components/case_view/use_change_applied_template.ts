/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { z } from '@kbn/zod/v4';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { CaseSettings } from '../../../common/types/domain';
import type { TemplateSettings } from '../../../common/types/domain/template/v1';
import type { CaseUI } from '../../../common';
import type { FieldSchema } from '../../../common/types/domain/template/fields';
import { isDisplayOnlyField, isInlineField } from '../../../common/types/domain/template/fields';
import { patchCase } from '../../containers/api';
import { casesMutationsKeys } from '../../containers/constants';
import { useCasesToast } from '../../common/use_cases_toast';
import type { ServerError } from '../../types';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';
import * as i18n from './translations';

type Field = z.infer<typeof FieldSchema>;

/**
 * A template's raw definition values as passed to {@link useChangeAppliedTemplate}. `settings` is
 * applied to the case; the case's connector is intentionally left untouched (applying a template
 * never changes an existing case's connector — see the apply-template modal notice). `null` removes
 * the applied template.
 */
export type NewAppliedTemplate = {
  id: string;
  version: number;
  fields: Field[];
  settings?: TemplateSettings;
} | null;

interface ChangeAppliedTemplateArgs {
  caseData: CaseUI;
  /** Pass null to remove the applied template. `settings` are the template's raw definition values. */
  newTemplate: NewAppliedTemplate;
}

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
    // Display-only fields (e.g. MARKDOWN) hold no value and are never written to the case.
    if (isInlineField(field) && !isDisplayOnlyField(field)) {
      const snakeKey = getFieldSnakeKey(field.name, field.type);
      const camelKey = getFieldCamelKey(field.name, field.type);
      const existingValue = currentExtendedFields[camelKey];
      const value =
        existingValue !== undefined && existingValue !== ''
          ? String(existingValue)
          : getYamlDefaultAsString(field.metadata?.default);
      // Omit empty values instead of writing '' / '[]'. A present-but-empty key trips the server's
      // partial-update validation for required fields (the "Field X is required" error seen when
      // applying or changing a template); omitting it lets the update treat the field as untouched,
      // and the user fills it on the case afterwards.
      if (value !== '' && value !== '[]') {
        result[snakeKey] = value;
      }
    }
  }
  return result;
};

export const useChangeAppliedTemplate = () => {
  const { showErrorToast } = useCasesToast();

  return useMutation(
    ({ caseData, newTemplate }: ChangeAppliedTemplateArgs) => {
      const newExtendedFields = newTemplate
        ? computeNewExtendedFields(newTemplate.fields, caseData.extendedFields ?? {})
        : {};
      return patchCase({
        caseId: caseData.id,
        updatedCase: {
          template: newTemplate ? { id: newTemplate.id, version: newTemplate.version } : null,
          [CASE_EXTENDED_FIELDS]: newExtendedFields,
          // The applied template owns the case settings (a template that declares none, or removing
          // the template, resets them to off). The case's connector is intentionally NOT changed
          // here — applying a template never reassigns an existing case's connector.
          settings: buildTemplateSettings(newTemplate?.settings),
        },
        version: caseData.version,
      });
    },
    {
      mutationKey: casesMutationsKeys.changeAppliedTemplate,
      onSuccess: () => {
        // Applying a template changes case fields and settings that several independently-cached
        // components render. A full page reload is the simplest reliable way to reflect all of the
        // updates at once (react-query cache invalidation alone left some components stale).
        window.location.reload();
      },
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_CHANGING_TEMPLATE });
      },
    }
  );
};
