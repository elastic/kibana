/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ConnectorSelectableComponentProps } from './connector_selectable_component';
import { ConnectorSelectableComponent } from './connector_selectable_component';
import type { ConnectorSelectableFooterProps } from './connector_selectable_footer';
import { ConnectorSelectableFooter } from './connector_selectable_footer';

export type ConnectorSelectableProps = Pick<
  ConnectorSelectableComponentProps,
  | 'value'
  | 'onValueChange'
  | 'customConnectors'
  | 'preConfiguredConnectors'
  | 'defaultConnectorId'
  | 'renderOption'
  | 'data-test-subj'
> &
  Pick<ConnectorSelectableFooterProps, 'onAddConnectorClick' | 'onManageConnectorsClick'>;

export const ConnectorSelectable: React.FC<ConnectorSelectableProps> = (props) => {
  const footer: React.ReactElement = useMemo(
    () => (
      <ConnectorSelectableFooter
        onAddConnectorClick={props.onAddConnectorClick}
        onManageConnectorsClick={props.onManageConnectorsClick}
      />
    ),
    [props.onAddConnectorClick, props.onManageConnectorsClick]
  );

  return (
    <ConnectorSelectableComponent
      value={props.value}
      onValueChange={props.onValueChange}
      customConnectors={props.customConnectors}
      preConfiguredConnectors={props.preConfiguredConnectors}
      defaultConnectorId={props.defaultConnectorId}
      footer={footer}
      renderOption={props.renderOption}
      data-test-subj={props['data-test-subj']}
    />
  );
};
