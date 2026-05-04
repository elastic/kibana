/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALL_PIPELINES = '__all__';
export const SIGNAL_PREFIX = '__signal__';

export const getSignalType = (pipelineId: string): string => pipelineId.split('/')[0];
