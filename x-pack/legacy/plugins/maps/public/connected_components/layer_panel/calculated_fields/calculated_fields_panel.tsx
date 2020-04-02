/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { ILayer } from '../../../layers/layer';
import { FormattedMessage } from '@kbn/i18n/react';
import { CalculatedFieldDescriptor } from '../../../../common/descriptor_types';
import {
  EuiButtonIcon,
  EuiFlexItem,
  EuiTitle,
  EuiPanel,
  EuiFlexGroup,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiAccordion,
  EuiText,
  EuiLink,
} from '@elastic/eui';

type Props = {
  calculatedFields: CalculatedFieldDescriptor[];
  layer: ILayer;
}

export function CalculatedFieldsPanel(props: Props) {
  if (!props.layer || !props.layer.supportsCalculatedFields()) {
    return null;
  }

  return (
    <Fragment>
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.layerPanel.calculatedFieldsPanelTitle"
              defaultMessage="Calculated fields"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="m" />
      </EuiPanel>
      <EuiSpacer size="s" />
    </Fragment>
  );
}
