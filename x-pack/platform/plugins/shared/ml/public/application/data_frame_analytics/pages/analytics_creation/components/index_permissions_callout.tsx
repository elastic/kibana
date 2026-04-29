/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../contexts/kibana';
import { useHasRequiredIndicesPermissions } from '../hooks';

export const IndexPermissionsCallout: FC<{ indexName: string; docsType: 'start' | 'create' }> = ({
  indexName,
  docsType,
}) => {
  const {
    services: {
      docLinks: {
        links: {
          ml: { dFAStartJob, dFACreateJob },
        },
      },
    },
  } = useMlKibana();

  const docsLink = docsType === 'start' ? dFAStartJob : dFACreateJob;
  const hasRequiredIndicesPermissions = useHasRequiredIndicesPermissions(
    indexName,
    docsType === 'start'
  );
  // If 'hasRequiredIndicesPermissions' is undefined - the index passed to the check is an empty string
  if (hasRequiredIndicesPermissions === undefined || hasRequiredIndicesPermissions === true) {
    return null;
  }

  return (
    <>
      <EuiCallOut
        title={i18n.translate('xpack.ml.dataframe.analytics.create.permissionsCalloutTitle', {
          defaultMessage: 'Indices permissions required',
        })}
        iconType="warning"
        color="warning"
      >
        <p>
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.create.indicesPermissionsMessage"
            defaultMessage="You don't have the required permissions on the {indexName} index. Refer to the {docLink} for more information on requirements."
            values={{
              indexName,
              docLink: (
                <EuiLink href={docsLink} target="_blank">
                  <FormattedMessage
                    id="xpack.ml.dataframe.analytics.create.indicesPermissionsMessage.docsLink"
                    defaultMessage="documentation"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
