/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLink, EuiLinkAnchorProps } from '@elastic/eui';
import { metadata } from 'ui/metadata';

// TODO: metadata should be read from a useContext hook in new platform
const STACK_VERSION = metadata.branch;

// union type constisting of valid guide sections that we link to
type DocsSection = '/apm/get-started' | '/x-pack';

interface Props extends EuiLinkAnchorProps {
  section: DocsSection;
  path: string;
}

export function ElasticDocsLink({ section, path, ...rest }: Props) {
  const href = `https://www.elastic.co/guide/en${section}/${STACK_VERSION}${path}`;
  return <EuiLink href={href} {...rest} />;
}
