/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { LayerSelector } from './layer_selector';
import type { MlAnomalyLayersType } from './util';

interface UpdateAnomalySourceEditorProps {
  onChange: (...args: Array<{ propName: string; value: unknown }>) => void;
  typicalActual: MlAnomalyLayersType;
}

export const UpdateAnomalySourceEditor: FC<UpdateAnomalySourceEditorProps> = ({
  onChange,
  typicalActual,
}) => {
  return (
    <>
      <EuiPanel>
        <EuiTitle size="xs">
          <h6>
            <FormattedMessage id="xpack.ml.maps.settingsEditorLabel" defaultMessage="Anomalies" />
          </h6>
        </EuiTitle>
        <EuiSpacer size="s" />
        <LayerSelector
          onChange={(newTypicalActual: MlAnomalyLayersType) => {
            onChange({
              propName: 'typicalActual',
              value: newTypicalActual,
            });
          }}
          typicalActual={typicalActual}
        />
      </EuiPanel>
      <EuiSpacer size="s" />
    </>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default UpdateAnomalySourceEditor;
