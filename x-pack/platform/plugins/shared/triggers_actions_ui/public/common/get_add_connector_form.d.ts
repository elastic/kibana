import React from 'react';
import type { CreateConnectorFormProps } from '../application/sections/action_connector_form';
import type { ConnectorServices } from '../types';
export declare const getAddConnectorFormLazy: (props: CreateConnectorFormProps & {
    connectorServices: ConnectorServices;
}) => React.JSX.Element;
