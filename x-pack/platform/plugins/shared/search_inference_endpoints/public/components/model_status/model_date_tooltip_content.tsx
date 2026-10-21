/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { FormattedMessage } from '@kbn/i18n-react';

interface ModelDateTooltipContentProps {
  date: string | null;
  status: 'deprecated' | 'endOfLife';
}

export const ModelDateTooltipContent = ({ date, status }: ModelDateTooltipContentProps) => {
  if (status === 'endOfLife') {
    if (!date) {
      return (
        <FormattedMessage
          id="xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.contentNoDate"
          defaultMessage="This model has reached end of life and is no longer available."
        />
      );
    }

    return (
      <FormattedMessage
        id="xpack.searchInferenceEndpoints.eisModelCard.deprecatedEOLBadge.tooltip.content"
        defaultMessage="This model has been unavailable since {eolFormattedDate}."
        values={{
          eolFormattedDate: <span css={{ whiteSpace: 'nowrap' }}>{date}</span>,
        }}
      />
    );
  }

  if (!date) {
    return (
      <FormattedMessage
        id="xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.contentNoDate"
        defaultMessage="This model is deprecated. We recommend a newer model for optimal results."
      />
    );
  }

  return (
    <FormattedMessage
      id="xpack.searchInferenceEndpoints.eisModelCard.deprecatedBadge.tooltip.content"
      defaultMessage="This model will be unavailable after {deprecatedFormattedDate}."
      values={{
        deprecatedFormattedDate: <span css={{ whiteSpace: 'nowrap' }}>{date}</span>,
      }}
    />
  );
};
