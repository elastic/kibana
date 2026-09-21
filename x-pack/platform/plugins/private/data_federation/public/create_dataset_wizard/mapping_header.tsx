/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';

import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';

export interface MappingHeaderProps {
  docLinks: DocLinksStart;
}

export function MappingHeader({ docLinks }: MappingHeaderProps) {
  const datasetMappingsDocLink = `${docLinks.links.dataFederation.datasets}#declare-a-dataset-mapping`;

  return (
    <>
      <EuiTitle size="s">
        <h3>
          {i18n.translate('xpack.dataFederation.createDatasetWizard.schemaMappingsTitle', {
            defaultMessage: 'Schema mappings',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          {i18n.translate('xpack.dataFederation.createDatasetWizard.schemaMappingsDescription', {
            defaultMessage:
              "Optional definition of how documents should be indexed. Elastic infers the schema at query time by default. You can manually map desired fields below, and we'll infer the rest of the schema.",
          })}{' '}
          <EuiLink
            href={datasetMappingsDocLink}
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj="createDatasetWizardSchemaMappingsLearnMore"
          >
            {createDatasetWizardStrings.learnMore}
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
}

