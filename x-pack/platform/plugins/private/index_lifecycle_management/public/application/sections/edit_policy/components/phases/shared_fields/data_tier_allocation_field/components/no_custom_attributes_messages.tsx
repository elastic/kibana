/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DocLinksStart } from '@kbn/core/public';
export interface Props {
  docLinks: DocLinksStart;
}

export const noCustomAttributesTitle = i18n.translate(
  'xpack.indexLifecycleMgmt.editPolicy.noCustomAttributesTitle',
  { defaultMessage: 'No custom attributes defined' }
);

export const nodeAllocationMigrationGuidance = ({ docLinks }: Props) => (
  <FormattedMessage
    id="xpack.indexLifecycleMgmt.editPolicy.defaultToDataNodesDescription"
    defaultMessage="To allocate data to particular data nodes, {roleBasedGuidance} or configure custom node attributes in elasticsearch.yml."
    values={{
      roleBasedGuidance: (
        <EuiLink
          href={docLinks.links.elasticsearch.migrateIndexAllocationFilters}
          target="_blank"
          external={true}
        >
          {i18n.translate(
            'xpack.indexLifecycleMgmt.editPolicy.defaultToDataNodesDescription.migrationGuidanceMessage',
            {
              defaultMessage: 'use role-based allocation',
            }
          )}
        </EuiLink>
      ),
    }}
  />
);
