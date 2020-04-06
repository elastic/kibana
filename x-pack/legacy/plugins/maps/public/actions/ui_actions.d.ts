/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnyAction } from 'redux';

export function setOpenTOCDetails(layerIds?: string[]): AnyAction;

export function setIsLayerTOCOpen(open: boolean): AnyAction;

export function setReadOnly(readOnly: boolean): AnyAction;
