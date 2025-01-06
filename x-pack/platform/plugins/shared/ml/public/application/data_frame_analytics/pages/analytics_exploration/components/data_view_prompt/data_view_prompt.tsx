/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { useMlKibana } from '../../../../../contexts/kibana';

interface Props {
  color?: string;
  destIndex?: string;
}

export const DataViewPrompt: FC<Props> = ({ destIndex, color }) => {
  const {
    services: {
      http: { basePath },
      application: { capabilities },
    },
  } = useMlKibana();

  const {
    euiTheme: { size },
  } = useEuiTheme();

  const canCreateDataView = useMemo(
    () =>
      capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true,
    [capabilities]
  );

  return (
    <EuiText size="xs" color={color ?? 'warning'} css={{ padding: `${size.s}` }}>
      <FormattedMessage
        id="xpack.ml.dataframe.analytics.dataViewPromptMessage"
        defaultMessage="No data view exists for index {destIndex}. "
        values={{
          destIndex: destIndex ?? '',
        }}
      />
      {canCreateDataView === true ? (
        <FormattedMessage
          id="xpack.ml.dataframe.analytics.dataViewPromptLink"
          defaultMessage="{linkToDataViewManagement}{destIndex}."
          values={{
            destIndex: destIndex ? ` for ${destIndex}` : '',
            linkToDataViewManagement: (
              <EuiLink
                href={`${basePath.get()}/app/management/kibana/dataViews/create`}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.dataViewPromptLinkText"
                  defaultMessage="Create a data view"
                />
              </EuiLink>
            ),
          }}
        />
      ) : null}
    </EuiText>
  );
};
