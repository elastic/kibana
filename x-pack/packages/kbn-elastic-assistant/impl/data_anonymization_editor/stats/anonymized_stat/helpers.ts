/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

export const getColor = (isDataAnonymizable: boolean): 'default' | 'subdued' =>
  isDataAnonymizable ? 'default' : 'subdued';

export const getTooltipContent = ({
  anonymized,
  isDataAnonymizable,
}: {
  anonymized: number;
  isDataAnonymizable: boolean;
}): string =>
  !isDataAnonymizable || anonymized === 0
    ? i18n.NONE_OF_THE_DATA_WILL_BE_ANONYMIZED(isDataAnonymizable)
    : i18n.FIELDS_WILL_BE_ANONYMIZED(anonymized);
