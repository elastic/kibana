/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import * as i18n from './translations';

import type { SwimlaneFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { ConnectorFieldsPreviewProps } from '../types';
import { ConnectorCard } from '../card';
import { connectorValidator } from './validator';

const SwimlaneFieldsPreviewComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<SwimlaneFieldsType>
> = ({ connector }) => {
  const showMappingWarning = useMemo(() => connectorValidator(connector) != null, [connector]);

  return (
    <>
      <ConnectorCard
        connectorType={ConnectorTypes.swimlane}
        isLoading={false}
        listItems={[]}
        title={connector.name}
      />
      {showMappingWarning && (
        <EuiCallOut
          title={i18n.EMPTY_MAPPING_WARNING_TITLE}
          color="danger"
          iconType="warning"
          data-test-subj="mapping-warning-callout"
        >
          {i18n.EMPTY_MAPPING_WARNING_DESC}
        </EuiCallOut>
      )}
    </>
  );
};
SwimlaneFieldsPreviewComponent.displayName = 'SwimlaneFieldsPreview';

// eslint-disable-next-line import/no-default-export
export { SwimlaneFieldsPreviewComponent as default };
