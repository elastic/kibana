import React from 'react';
import type { ActionsNavigation } from '../../user_actions/types';
interface EndpointInfo {
    endpointId: string;
    hostname: string;
}
interface Props {
    type: string;
    endpoints: EndpointInfo[];
    href?: ActionsNavigation['href'];
    onClick?: ActionsNavigation['onClick'];
}
export declare const HostIsolationCommentEvent: React.NamedExoticComponent<Props>;
export {};
