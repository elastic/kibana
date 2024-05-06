/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TypeOf } from '@kbn/typed-react-router-config';
import { EuiLink } from '@elastic/eui';
import { useApmRouter } from '../../../../../hooks/use_apm_router';
import { mobileServiceDetailRoute } from '../../../../routing/mobile_service_detail';

interface Props {
  children: React.ReactNode;
  title?: string;
  serviceName: string;
  groupId: string;
  query: TypeOf<
    typeof mobileServiceDetailRoute,
    '/mobile-services/{serviceName}/errors-and-crashes'
  >['query'];
}

function ErrorDetailLink({ serviceName, groupId, query, ...rest }: Props) {
  const router = useApmRouter();
  const errorDetailsLink = router.link(
    `/mobile-services/{serviceName}/errors-and-crashes/errors/{groupId}`,
    {
      path: {
        serviceName,
        groupId,
      },
      query,
    }
  );

  return (
    <EuiLink
      data-test-subj="apmMobileErrorDetailsLink"
      href={errorDetailsLink}
      {...rest}
    />
  );
}

export { ErrorDetailLink };
