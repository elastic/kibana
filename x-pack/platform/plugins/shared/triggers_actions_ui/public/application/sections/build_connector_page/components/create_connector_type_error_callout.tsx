/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { UseBuildConnectorFormReturnValue } from '../hooks/use_build_connector_form';

type Props = Pick<UseBuildConnectorFormReturnValue, 'createConnectorTypeError'> & {
  'data-test-subj'?: string;
};

/** The error returned by the API when registering the connector type fails. */
const CreateConnectorTypeErrorCalloutComponent: React.FC<Props> = ({
  createConnectorTypeError,
  'data-test-subj': dataTestSubj,
}) => {
  if (!createConnectorTypeError) {
    return null;
  }
  return (
    <>
      <KbnDangerCallout
        announceOnMount
        size="s"
        data-test-subj={dataTestSubj}
        title={createConnectorTypeError.title}
        text={createConnectorTypeError.message}
      />
      <EuiSpacer size="m" />
    </>
  );
};

export const CreateConnectorTypeErrorCallout = memo(CreateConnectorTypeErrorCalloutComponent);
