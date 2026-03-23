/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type React from 'react';
import { type RouteProps } from 'react-router-dom-v5-compat';
import type { RouteHandle, WithHandle } from './types';

/**
 * InkRoute is a dummy component that is rendered as a Route element in InkRoutes.
 * This allows for typing of `handle`, which is untyped by default. Rendering a Route
 * here trips up react-router which expects an element of type Route.
 */
export function InkRoute<THandle extends RouteHandle | undefined = RouteHandle | undefined>(
  props: WithHandle<RouteProps, THandle>
): React.ReactElement {
  throw new Error(`InkRoute should never be rendered directly, only as a child of InkRoutes`);
}
