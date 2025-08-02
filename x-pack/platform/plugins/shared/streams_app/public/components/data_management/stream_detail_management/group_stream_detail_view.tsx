/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '@kbn/streams-schema';
import { EuiDescriptionList, EuiLink } from '@elastic/eui';
import React from 'react';

export const GroupStreamDetailView = ({
  definition,
}: {
  definition: Streams.GroupStream.GetResponse;
}) => {
  const stream = definition.stream;

  const renderLinks = (links: string[]) =>
    links.length
      ? links
          .map((link, idx) => (
            <EuiLink key={idx} href={link} target="_blank" rel="noopener noreferrer">
              {link}
            </EuiLink>
          ))
          .reduce((prev, curr) => (
            <>
              {prev}, {curr}
            </>
          ))
      : 'None';

  const meta = [
    {
      title: 'Owner',
      description: stream.group.owner,
    },
    {
      title: 'Tier',
      description: stream.group.tier,
    },
    {
      title: 'Tags',
      description: stream.group.tags.length ? stream.group.tags.join(', ') : 'None',
    },
    {
      title: 'Runbook links',
      description: renderLinks(stream.group.runbook_links),
    },
    {
      title: 'Documentation links',
      description: renderLinks(stream.group.documentation_links),
    },
    {
      title: 'Repository links',
      description: renderLinks(stream.group.repository_links),
    },
  ];

  return <EuiDescriptionList textStyle="reverse" listItems={meta} />;
};
