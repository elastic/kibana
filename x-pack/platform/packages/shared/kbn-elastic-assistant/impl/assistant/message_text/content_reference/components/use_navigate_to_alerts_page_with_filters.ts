/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterControlConfig } from '@kbn/alerts-ui-shared';
import { encode } from '@kbn/rison';
import { useAssistantContext } from '../../../../..';

const formatPageFilterSearchParam = (filters: FilterControlConfig[]) =>
  filters.map(
    ({
      title,
      fieldName,
      selectedOptions = [],
      existsSelected = false,
      exclude = false,
      hideActionBar = false,
    }) => ({
      title: title ?? fieldName,
      selectedOptions,
      fieldName,
      existsSelected,
      exclude,
      hideActionBar,
    })
  );

export const useNavigateToAlertsPageWithFilters = () => {
  const { navigateToApp } = useAssistantContext();

  return (
    /**
     * Pass one or more filter control configurations to be applied to the alerts page filters
     */
    filterItems: FilterControlConfig | FilterControlConfig[],
    /**
     * If true, the alerts page will be opened in a new tab
     */
    openInNewTab = false,
    /**
     * Allows to customize the timerange url parameter. Should only be used in combination with the openInNewTab=true parameter
     */
    timerange?: string
  ) => {
    const urlFilterParams = encode(
      formatPageFilterSearchParam(Array.isArray(filterItems) ? filterItems : [filterItems])
    );
    const timerangePath = timerange ? `&timerange=${timerange}` : '';
    // securitySolutionUI === SecurityPageName.alerts from @kbn/security-solution-navigation
    navigateToApp('securitySolutionUI', {
      // alerts === SecurityPageName.alerts from @kbn/security-solution-navigation
      deepLinkId: 'alerts',
      // pageFilters === URL_PARAM_KEY.pageFilter from @kbn/security-solution-plugin/public/common/hooks/use_url_state
      path: `?pageFilters=${urlFilterParams}${timerangePath}`,
      openInNewTab,
    });
  };
};
