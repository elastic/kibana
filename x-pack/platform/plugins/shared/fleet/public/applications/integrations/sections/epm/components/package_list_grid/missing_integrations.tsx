/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { ExtendedIntegrationCategory } from '../../screens/home/category_facets';
import type { IntegrationsURLParameters } from '../../screens/home/hooks/use_available_packages';

interface MissingIntegrationContentProps {
  resetQuery: () => void;
  setSelectedCategory: (category: ExtendedIntegrationCategory) => void;
  setUrlandPushHistory: (params: IntegrationsURLParameters) => void;
}

export const MissingIntegrationContent = ({
  resetQuery,
  setSelectedCategory,
  setUrlandPushHistory,
}: MissingIntegrationContentProps) => {
  const handleCustomInputsLinkClick = useCallback(() => {
    resetQuery();
    setSelectedCategory('custom');
    setUrlandPushHistory({
      categoryId: 'custom',
      subCategoryId: '',
    });
  }, [resetQuery, setSelectedCategory, setUrlandPushHistory]);

  return (
    <EuiText size="s" color="subdued">
      <p>
        <FormattedMessage
          id="xpack.fleet.integrations.missing"
          defaultMessage="Don't see an integration? Collect any logs or metrics using our {customInputsLink}. Request new integrations in our {forumLink}."
          values={{
            customInputsLink: (
              <EuiLink onClick={handleCustomInputsLinkClick}>
                <FormattedMessage
                  id="xpack.fleet.integrations.customInputsLink"
                  defaultMessage="custom inputs"
                />
              </EuiLink>
            ),
            forumLink: (
              <EuiLink href="https://discuss.elastic.co/tag/integrations" external target="_blank">
                <FormattedMessage
                  id="xpack.fleet.integrations.discussForumLink"
                  defaultMessage="forum"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
};
