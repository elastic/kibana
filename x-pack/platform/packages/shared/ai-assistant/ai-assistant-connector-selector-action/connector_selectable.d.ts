import React from 'react';
import type { ConnectorSelectableComponentProps } from './connector_selectable_component';
import type { ConnectorSelectableFooterProps } from './connector_selectable_footer';
export type ConnectorSelectableProps = Pick<ConnectorSelectableComponentProps, 'value' | 'onValueChange' | 'customConnectors' | 'preConfiguredConnectors' | 'defaultConnectorId' | 'renderOption' | 'data-test-subj'> & Pick<ConnectorSelectableFooterProps, 'onAddConnectorClick' | 'onManageConnectorsClick'>;
export declare const ConnectorSelectable: React.FC<ConnectorSelectableProps>;
