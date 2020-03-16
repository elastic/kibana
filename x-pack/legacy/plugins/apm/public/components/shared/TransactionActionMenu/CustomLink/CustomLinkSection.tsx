/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { Transaction } from '../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import { CustomLink } from '../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';
import {
  SectionLinks,
  SectionLink
} from '../../../../../../../../plugins/observability/public';
import { replaceVariablesInUrl } from './helper';

export const CustomLinkSection = ({
  customLinks,
  transaction
}: {
  customLinks: CustomLink[];
  transaction: Transaction;
}) => (
  <SectionLinks>
    {customLinks.map(link => (
      <SectionLink
        key={link.id}
        label={link.label}
        href={replaceVariablesInUrl(link.url, transaction)}
        target="_blank"
      />
    ))}
  </SectionLinks>
);
