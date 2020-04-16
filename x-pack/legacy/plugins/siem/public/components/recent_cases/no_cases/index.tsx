/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';

import { getCreateCaseUrl } from '../../link_to/redirect_to_case';
import { useGetUrlSearch } from '../../navigation/use_get_url_search';
import { navTabs } from '../../../pages/home/home_navigations';

import * as i18n from '../translations';

const NoCasesComponent = () => {
  const urlSearch = useGetUrlSearch(navTabs.case);
  const newCaseLink = useMemo(
    () => <EuiLink href={getCreateCaseUrl(urlSearch)}>{` ${i18n.START_A_NEW_CASE}`}</EuiLink>,
    [urlSearch]
  );

  return (
    <>
      <span>{i18n.NO_CASES}</span>
      {newCaseLink}
      {'!'}
    </>
  );
};

NoCasesComponent.displayName = 'NoCasesComponent';

export const NoCases = React.memo(NoCasesComponent);
