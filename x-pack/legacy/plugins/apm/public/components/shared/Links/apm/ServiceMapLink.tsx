/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';

interface ServiceMapLinkProps extends APMLinkExtendProps {
  serviceName?: string;
}

const ServiceMapLink = ({ serviceName, ...rest }: ServiceMapLinkProps) => {
  const path = serviceName
    ? `/services/${serviceName}/service-map`
    : '/service-map';
  return <APMLink path={path} {...rest} />;
};

export { ServiceMapLink };
