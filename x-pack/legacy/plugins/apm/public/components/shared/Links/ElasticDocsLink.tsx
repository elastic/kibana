/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

// union type constisting of valid guide sections that we link to
type DocsSection = '/apm/get-started' | '/x-pack' | '/apm/server';

interface Props extends EuiLinkAnchorProps {
  section: DocsSection;
  path: string;
}

export function ElasticDocsLink({ section, path, children, ...rest }: Props) {
  const { version } = useApmPluginContext().packageInfo;
  const href = `https://www.elastic.co/guide/en${section}/${version}${path}`;
  return typeof children === 'function' ? (
    children(href)
  ) : (
    <EuiLink href={href} {...rest}>
      children
    </EuiLink>
  );
}
