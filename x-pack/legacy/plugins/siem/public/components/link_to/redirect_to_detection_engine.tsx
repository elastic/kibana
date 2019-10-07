/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router';
import { RedirectWrapper } from './redirect_wrapper';

export type DetectionEngineComponentProps = RouteComponentProps<{
  search: string;
}>;

export const DETECTION_ENGINE_PAGE_NAME = 'detection-engine';

export const RedirectToDetectionEnginePage = ({
  location: { search },
}: DetectionEngineComponentProps) => (
  <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}${search}`} />
);

export const getDetectionEngineUrl = () => `#/link-to/${DETECTION_ENGINE_PAGE_NAME}`;
