/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import type { z } from '@kbn/zod/v4';
import { CASE_EXTENDED_FIELDS } from '../../../common/constants';
import type { CaseUI } from '../../../common';
import type { FieldSchema } from '../../../common/types/domain/template/fields';
import { isInlineField } from '../../../common/types/domain/template/fields';
import { patchCase } from '../../containers/api';
import { casesMutationsKeys } from '../../containers/constants';
import { useCasesToast } from '../../common/use_cases_toast';
import type { ServerError } from '../../types';
import { getFieldCamelKey, getFieldSnakeKey } from '../../../common/utils';
import { getYamlDefaultAsString } from '../templates_v2/utils';
import { useRefreshCaseViewPage } from './use_on_refresh_case_view_page';
import * as i18n from './translations';

type Field = z.infer<typeof FieldSchema>;

interface ChangeAppliedTemplateArgs {
  caseData: CaseUI;
  /** Pass null to remove the applied template. */
  newTemplate: { id: string; version: number; fields: Field[] } | null;
}

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
