import React from 'react';
import type { OAuthClient } from './service/application_connections_api_client';
export interface RevokeClientDetailsPopoverProps {
    client: OAuthClient;
}
export declare const RevokeClientDetailsPopover: ({ client }: RevokeClientDetailsPopoverProps) => React.JSX.Element;
