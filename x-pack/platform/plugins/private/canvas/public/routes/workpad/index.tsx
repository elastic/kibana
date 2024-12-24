/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteComponentProps } from 'react-router-dom';

export { WorkpadRoute, ExportWorkpadRoute } from './workpad_route';

export type { WorkpadRoutingContextType } from './workpad_routing_context';
export { WorkpadRoutingContext } from './workpad_routing_context';

export interface WorkpadRouteParams {
  id: string;
  pageNumber?: string;
}

export interface WorkpadPageRouteParams extends WorkpadRouteParams {
  pageNumber: string;
}

export type WorkpadRouteProps = RouteComponentProps<WorkpadRouteParams>;
export type WorkpadPageRouteProps = RouteComponentProps<WorkpadPageRouteParams>;
