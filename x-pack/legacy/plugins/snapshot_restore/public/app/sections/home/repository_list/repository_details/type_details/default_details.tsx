/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

import { EuiCodeEditor, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Repository } from '../../../../../../../common/types';
import { useAppDependencies } from '../../../../../index';

import 'brace/theme/textmate';

interface Props {
  repository: Repository;
}

export const DefaultDetails: React.FunctionComponent<Props> = ({
  repository: { name, settings },
}) => {
  const {
    core: {
      i18n: { FormattedMessage },
    },
  } = useAppDependencies();

  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.settingsTitle"
            defaultMessage="Settings"
          />
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiCodeEditor
        mode="json"
        theme="textmate"
        width="100%"
        isReadOnly
        value={JSON.stringify(settings, null, 2)}
        setOptions={{
          showLineNumbers: false,
          tabSize: 2,
          maxLines: Infinity,
        }}
        editorProps={{
          $blockScrolling: Infinity,
        }}
        showGutter={false}
        minLines={6}
        aria-label={
          <FormattedMessage
            id="xpack.snapshotRestore.repositoryDetails.genericSettingsDescription"
            defaultMessage="Readonly settings for repository '{name}'"
            values={{
              name,
            }}
          />
        }
      />
    </Fragment>
  );
};
