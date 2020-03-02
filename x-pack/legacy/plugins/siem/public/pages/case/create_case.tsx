/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { WrapperPage } from '../../components/wrapper_page';
import { Create } from './components/create';
import { SpyRoute } from '../../utils/route/spy_routes';
import { CaseHeaderPage } from './components/case_header_page';
import * as i18n from './translations';
import { getCaseUrl } from '../../components/link_to';

const backOptions = {
  href: getCaseUrl(),
  text: i18n.BACK_TO_ALL,
};

export const CreateCasePage = React.memo(() => (
  <>
    <WrapperPage>
      <CaseHeaderPage backOptions={backOptions} title={i18n.CREATE_TITLE} />
      <Create />
    </WrapperPage>
    <SpyRoute />
  </>
));

CreateCasePage.displayName = 'CreateCasePage';
