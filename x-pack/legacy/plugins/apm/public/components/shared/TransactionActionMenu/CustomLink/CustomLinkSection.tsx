/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import Mustache from 'mustache';
import { CustomLink } from '../../../../../../../../plugins/apm/common/custom_link/custom_link_types';
import { Transaction } from '../../../../../../../../plugins/apm/typings/es_schemas/ui/transaction';
import {
  SectionLinks,
  SectionLink
} from '../../../../../../../../plugins/observability/public';

export const CustomLinkSection = ({
  customLinks,
  transaction
}: {
  customLinks: CustomLink[];
  transaction: Transaction;
}) => (
  <SectionLinks>
    {customLinks.map(link => {
      let href = link.url;
      try {
        href = Mustache.render(link.url, transaction);
      } catch (e) {
        // ignores any error that happens
      }
      return (
        <SectionLink
          key={link.id}
          label={link.label}
          href={href}
          target="_blank"
        />
      );
    })}
  </SectionLinks>
);
