/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from '../translations';

export const getAnonymizationTooltip = ({
  conversationHasReplacements,
  showAnonymizedValuesChecked,
}: {
  conversationHasReplacements: boolean;
  showAnonymizedValuesChecked: boolean;
}): string => {
  if (!conversationHasReplacements) {
    return i18n.THIS_CONVERSATION_DOES_NOT_INCLUDE_ANONYMIZED_FIELDS;
  }

  return showAnonymizedValuesChecked ? i18n.SHOW_REAL_VALUES : i18n.SHOW_ANONYMIZED;
};
