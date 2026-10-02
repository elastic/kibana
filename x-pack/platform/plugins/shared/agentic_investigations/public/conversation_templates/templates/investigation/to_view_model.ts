/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '../../../../common';
import { getSubjectTitle } from '../../../subjects/attachments/subject_title';
import { NEW_INVESTIGATION_TITLE } from './translations';

/**
 * The investigation's title, or while Agent Builder has not generated it yet (it does on the
 * first round), what the first subject is called, or else a generic "New investigation".
 */
export const getInvestigationDisplayTitle = ({
  title,
  title_pending: titlePending,
  subjects,
}: Pick<InvestigationSummary, 'title' | 'title_pending' | 'subjects'>): string => {
  if (!titlePending) {
    return title;
  }
  const [first] = subjects;
  return first ? getSubjectTitle(first) : NEW_INVESTIGATION_TITLE;
};
