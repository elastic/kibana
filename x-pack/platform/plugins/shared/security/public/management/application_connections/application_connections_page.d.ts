import React from 'react';
import type { HttpStart } from '@kbn/core/public';
export interface ApplicationConnectionsPageProps {
    http: HttpStart;
}
export declare const ApplicationConnectionsPage: ({ http }: ApplicationConnectionsPageProps) => React.JSX.Element;
