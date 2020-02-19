/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { WrapperPage } from '../../components/wrapper_page';
import { HeaderPage } from '../../components/header_page';
import { SpyRoute } from '../../utils/route/spy_routes';
import * as i18n from './translations';

const ConfigureCasesPageComponent: React.FC = () => (
  <>
    <WrapperPage>
      <HeaderPage title={i18n.CONFIGURE_CASES} />
    </WrapperPage>
    <SpyRoute />
  </>
);

export const ConfigureCasesPage = React.memo(ConfigureCasesPageComponent);
