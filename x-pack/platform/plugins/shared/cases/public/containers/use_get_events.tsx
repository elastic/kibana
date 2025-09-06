/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { type DataView } from '@kbn/data-views-plugin/public';
import { AbortError } from '@kbn/kibana-utils-plugin/common';
import { useToasts } from '../common/lib/kibana';
import { casesQueriesKeys } from './constants';
import * as i18n from './translations';
import { searchEvents } from './api';

export const useGetEvents = (
  dataView: DataView | undefined,
  parameters: {
    caseId: string;
    columns: string[];
    eventIds: string[];
  }
) => {
  const toasts = useToasts();
  return useQuery(
    casesQueriesKeys.caseEvents(parameters.caseId, [
      dataView?.getIndexPattern(),
      ...parameters.eventIds,
      ...parameters.columns,
    ]),
    ({ signal }) => searchEvents(signal, dataView, parameters),
    {
      onError: (error: Error) => {
        if (error instanceof AbortError) {
          return;
        }

        toasts.addError(error, {
          title: i18n.ERROR_TITLE,
        });
      },
    }
  );
};
