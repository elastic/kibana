/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { datasetWizardStrings } from './dataset_wizard_i18n';

export const SCHEMA_MAPPINGS_FLOW3_DOCS_HREF =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation-datasets#declare-a-dataset-mapping';

export const SchemaMappingsDescriptionFlow3: FunctionComponent = () => (
  <FormattedMessage
    id="xpack.dataFederation.datasetWizard.schemaMappingsDescriptionFlow3"
    defaultMessage="Optional definition of how documents should be indexed. Elastic infers the schema at query time by default. You can manually map desired fields below, and we'll infer the rest of the schema. {docsLink}"
    values={{
      docsLink: (
        <EuiLink
          href={SCHEMA_MAPPINGS_FLOW3_DOCS_HREF}
          target="_blank"
          external
          data-test-subj="datasetWizardSchemaMappingsDocsLink"
        >
          {datasetWizardStrings.settingsCustomJsonDocsLinkLabel()}
        </EuiLink>
      ),
    }}
  />
);
