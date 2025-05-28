/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink } from '@elastic/eui';
import * as i18n from './translations';
import { useAssistantContext } from '../../assistant_context';

export const CostAwareness = () => {
  const {
    docLinks: { ELASTIC_LLM_TOUR_EXTRA_COST_LINK, ELASTIC_LLM_LINK },
  } = useAssistantContext();

  return (
    <FormattedMessage
      id="xpack.elasticAssistant.elasticLLM.tour.content"
      defaultMessage="Elastic Managed LLM connector is our new default, pre-configured LLM connector. It will incur {additionalCost} You can continue to use other LLM connectors as normal. {learnMore}"
      values={{
        additionalCost: (
          <EuiLink href={ELASTIC_LLM_TOUR_EXTRA_COST_LINK} external>
            {i18n.ELASTIC_LLM_ADDITIONAL_COST}
          </EuiLink>
        ),
        learnMore: (
          <EuiLink href={ELASTIC_LLM_LINK} external>
            {i18n.ELASTIC_LLM_TOUR_LEARN_MORE}
          </EuiLink>
        ),
      }}
    />
  );
};
