/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AvailabilityCache } from '../../common/availability_cache';

/**
 * @deprecated Use {@link AvailabilityCache} directly. This subclass exists only
 * for backward compatibility with callers that reference the old class name.
 */
export class AgentAvailabilityCache extends AvailabilityCache {}
