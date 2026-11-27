/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CaseDeltaItem } from '../../../../../common/types/api';
import type { CaseSeverity, CaseStatuses } from '../../../../../common/types/domain';
import { severities } from '../../../severity/config';
import { statuses } from '../../../status/config';
import * as i18n from './translations';

const isCaseStatus = (value: string | null): value is CaseStatuses =>
  value != null && value in statuses;

const isCaseSeverity = (value: string | null): value is CaseSeverity =>
  value != null && value in severities;

/** A short line that names the item behind a citation. */
export const describeSource = ({
  category,
  type,
  author,
  detail,
  count,
}: CaseDeltaItem): string => {
  const who = author ?? '';

  if (category === 'alerts') {
    return detail ? i18n.SOURCE_ALERT(detail) : i18n.SOURCE_ALERT_NO_RULE;
  }
  if (category === 'comments') {
    return i18n.SOURCE_COMMENT(who);
  }
  if (category === 'evidence') {
    return type === 'observables'
      ? i18n.SOURCE_OBSERVABLES(count, detail ?? '')
      : i18n.SOURCE_FILE(detail ?? '');
  }
  if (type === 'status' && isCaseStatus(detail)) {
    return i18n.SOURCE_STATUS(statuses[detail].label, who);
  }
  if (type === 'severity' && isCaseSeverity(detail)) {
    return i18n.SOURCE_SEVERITY(severities[detail].label, who);
  }
  return i18n.SOURCE_OTHER_CHANGE(who);
};
