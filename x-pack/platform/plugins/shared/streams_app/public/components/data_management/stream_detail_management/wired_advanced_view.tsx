/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import { isRoot } from '@kbn/streams-schema';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { IndexConfiguration } from './advanced_view/index_configuration';
import { DeleteStreamPanel } from './advanced_view/delete_stream';

export function WiredAdvancedView({
  definition,
  refreshDefinition,
}: {
  definition: Streams.WiredStream.GetResponse;
  refreshDefinition: () => void;
}) {
  return (
    <>
      <IndexConfiguration definition={definition} refreshDefinition={refreshDefinition}>
        <EuiCallOut
          iconType="warning"
          color="primary"
          title={i18n.translate(
            'xpack.streams.streamDetailView.indexConfiguration.inheritSettingsTitle',
            {
              defaultMessage:
                'Changes will be inherited by child streams unless they override them explicitly.',
            }
          )}
        />
        <EuiSpacer size="l" />
      </IndexConfiguration>

      {!isRoot(definition.stream.name) && (
        <>
          <EuiSpacer />
          <DeleteStreamPanel definition={definition} />
        </>
      )}

      <EuiSpacer />
    </>
  );
}
