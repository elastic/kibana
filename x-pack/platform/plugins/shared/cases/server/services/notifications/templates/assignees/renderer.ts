/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import mustache from 'mustache';
import { join } from 'path';
import { assertNever } from '@elastic/eui';
import { CaseStatuses, CaseSeverity } from '../../../../../common/types/domain';
import type { CaseSavedObjectTransformed } from '../../../../common/types/case';
import { getTemplateFilePath } from '../utils';

const TAG_LIMIT = 3;
const DESCRIPTION_LIMIT = 300;

export const getStatusColor = (status: CaseStatuses | null | undefined): string => {
  if (!status) {
    return '#FFF';
  }

  switch (status) {
    case CaseStatuses.open:
      return '#0077CC';
    case CaseStatuses['in-progress']:
      return '#FEC514';
    case CaseStatuses.closed:
      return '#D3DAE6';
    default:
      return assertNever(status);
  }
};

export const getSeverityColor = (severity: CaseSeverity | null | undefined): string => {
  if (!severity) {
    return '#FFF';
  }

  switch (severity) {
    case CaseSeverity.LOW:
      return '#54B399';
    case CaseSeverity.MEDIUM:
      return '#D6BF57';
    case CaseSeverity.HIGH:
      return '#DA8B45';
    case CaseSeverity.CRITICAL:
      return '#E7664C';
    default:
      return assertNever(severity);
  }
};

export const assigneesTemplateRenderer = async (
  caseData: CaseSavedObjectTransformed,
  caseUrl: string | null
): Promise<string> => {
  const fileDir = join('.', 'assignees');
  const fileName = 'template.html';

  const dataPath = getTemplateFilePath(fileDir, fileName);

  const content = await fs.promises.readFile(dataPath, 'utf8');

  const hasMoreTags = caseData.attributes.tags.length > TAG_LIMIT;
  const numOfExtraTags = Math.max(caseData.attributes.tags.length - TAG_LIMIT, 0);

  const template = mustache.render(content, {
    title: caseData.attributes.title,
    status: caseData.attributes.status,
    statusColor: getStatusColor(caseData.attributes.status),
    severity: caseData.attributes.severity,
    severityColor: getSeverityColor(caseData.attributes.severity),
    hasMoreTags: hasMoreTags ? numOfExtraTags : null,
    tags: caseData.attributes.tags.slice(0, TAG_LIMIT),
    description:
      caseData.attributes.description.length > DESCRIPTION_LIMIT
        ? `${caseData.attributes.description.slice(0, DESCRIPTION_LIMIT)}...`
        : caseData.attributes.description,
    url: caseUrl,
    currentYear: new Date().getUTCFullYear(),
  });

  return template;
};
