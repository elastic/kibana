import React from 'react';
import type { FleetServerHostSSLInputsType } from './use_fleet_server_host_form';
interface Props {
    inputs: FleetServerHostSSLInputsType;
    useOutputSecretsStorage: boolean;
    useSSLSecretsStorage: boolean;
    isConvertedToSecret: {
        sslKey: boolean;
        sslESKey: boolean;
        sslAgentKey: boolean;
    };
}
export declare const SSLFormSection: React.FunctionComponent<Props>;
export {};
