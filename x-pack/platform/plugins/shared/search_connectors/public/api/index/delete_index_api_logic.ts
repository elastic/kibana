/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { HttpSetup } from '@kbn/core/public';
import { Actions, createApiLogic } from '../api_logic/create_api_logic';

export interface DeleteIndexApiLogicArgs {
  indexName: string;
  http?: HttpSetup;
}

export interface DeleteIndexApiLogicValues {
  indexName: string;
}

export const deleteIndex = async ({
  indexName,
  http,
}: DeleteIndexApiLogicArgs): Promise<DeleteIndexApiLogicValues> => {
  const route = `/internal/enterprise_search/indices/${indexName}`;
  await http?.delete(route);
  return { indexName };
};

export const DeleteIndexApiLogic = createApiLogic(['delete_index_api_logic'], deleteIndex, {
  showSuccessFlashFn: ({ indexName }) =>
    i18n.translate('xpack.enterpriseSearch.content.indices.deleteIndex.successToast.title', {
      defaultMessage:
        'Your index {indexName} and any associated ingestion configurations were successfully deleted',
      values: {
        indexName,
      },
    }),
});

export type DeleteIndexApiActions = Actions<DeleteIndexApiLogicArgs, DeleteIndexApiLogicValues>;
