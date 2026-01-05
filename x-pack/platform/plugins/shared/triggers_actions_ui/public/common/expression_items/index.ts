/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../../application/lib/suspended_component_with_props';

export const GroupByExpression = suspendedComponentWithProps(lazy(() => import('./group_by_over')));
export const ForLastExpression = suspendedComponentWithProps(lazy(() => import('./for_the_last')));
export const ValueExpression = suspendedComponentWithProps(lazy(() => import('./value')));

export const WhenExpression = suspendedComponentWithProps(lazy(() => import('./when')));
export const OfExpression = suspendedComponentWithProps(lazy(() => import('./of')));
export const ThresholdExpression = suspendedComponentWithProps(lazy(() => import('./threshold')));
