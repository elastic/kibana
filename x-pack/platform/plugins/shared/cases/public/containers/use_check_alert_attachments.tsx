/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CaseUI } from './types';
import { type GetAttachments } from '../components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';

export interface UseCheckAlertAttachmentsProps {
  cases: CaseUI[];
  getAttachments?: GetAttachments;
}

export const useCheckAlertAttachments = ({
  cases,
  getAttachments,
}: UseCheckAlertAttachmentsProps): Set<string> => {
  const caseAttachments = cases.reduce<string[]>((acc, cur) => {
    // getAttachments returns any items that are not already attached to the case
    // when there are 0 items, it means all selected alerts are attached already
    if (getAttachments?.({ theCase: cur })?.length === 0) acc.push(cur.id);
    // if the `getAttachments` implementation does not handle a case prop,
    // the existing functionality is preserved, and all cases will allow attachments
    return acc;
  }, []);

  return new Set(caseAttachments);
};

export type UseCheckAlertAttachments = ReturnType<typeof useCheckAlertAttachments>;
