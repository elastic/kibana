/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const QueryActivityNoAccessPrompt: React.FC<{ missingClusterPrivileges: string[] }> = ({
  missingClusterPrivileges,
}) => {
  return (
    <EuiPageTemplate
      minHeight="0"
      style={{ minHeight: 420 }}
      restrictWidth={false}
      data-test-subj="queryActivityNoAccessPrompt"
    >
      <EuiPageTemplate.Section alignment="center">
        <EuiEmptyPrompt
          iconType="lock"
          color="plain"
          layout="vertical"
          title={
            <h2>
              <FormattedMessage
                id="xpack.queryActivity.noAccess.title"
                defaultMessage="Contact your administrator for access"
              />
            </h2>
          }
          body={
            <>
              <p>
                <FormattedMessage
                  id="xpack.queryActivity.noAccess.description"
                  defaultMessage="To view query activity in this space, you need additional privileges."
                />
              </p>
              {missingClusterPrivileges.length > 0 && (
                <p>
                  <FormattedMessage
                    id="xpack.queryActivity.noAccess.missingClusterPrivileges"
                    defaultMessage="Missing Elasticsearch cluster {privilegesCount, plural, one {privilege} other {privileges}}: {missingPrivileges}."
                    values={{
                      missingPrivileges: missingClusterPrivileges.join(', '),
                      privilegesCount: missingClusterPrivileges.length,
                    }}
                  />
                </p>
              )}
            </>
          }
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
