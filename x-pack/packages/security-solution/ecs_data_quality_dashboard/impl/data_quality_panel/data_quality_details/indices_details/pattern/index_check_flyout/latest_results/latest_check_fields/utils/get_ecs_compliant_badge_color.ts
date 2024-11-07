/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsCompliantFieldMetadata } from '../../../../../../../types';
import { isTimestampFieldMissing } from './is_timestamp_field_missing';

/**
 * Determines the badge color for ECS compliant fields
 */
export const getEcsCompliantBadgeColor = (
  ecsCompliantFields: EcsCompliantFieldMetadata[]
): string => (isTimestampFieldMissing(ecsCompliantFields) ? 'danger' : 'hollow');
