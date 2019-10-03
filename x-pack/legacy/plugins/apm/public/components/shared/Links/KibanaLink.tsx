/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import React from 'react';
import url from 'url';
import { useKibanaCore } from '../../../../../observability/public';
import { LegacyCoreStart } from '../../../../../../../../src/core/public/';

interface Props extends EuiLinkAnchorProps {
  path?: string;
  children?: React.ReactNode;
  core?: LegacyCoreStart;
}

export function KibanaLink({ path, core, ...rest }: Props) {
  const coreFromContext = useKibanaCore();
  if (!core && !coreFromContext) {
    return null;
  }
  const href = url.format({
    pathname: (core || coreFromContext).http.basePath.prepend('/app/kibana'),
    hash: path
  });
  return <EuiLink {...rest} href={href} />;
}
