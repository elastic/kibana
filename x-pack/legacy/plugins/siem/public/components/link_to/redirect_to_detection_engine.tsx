/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

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

export const RedirectToRulesPage = ({ location: { search } }: DetectionEngineComponentProps) => {
  return <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules${search}`} />;
};

export const RedirectToCreateRulePage = ({
  location: { search },
}: DetectionEngineComponentProps) => {
  return <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules/create-rule${search}`} />;
};

export const RedirectToRuleDetailsPage = ({
  location: { search },
}: DetectionEngineComponentProps) => {
  return <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules/rule-details${search}`} />;
};

export const RedirectToEditRulePage = ({ location: { search } }: DetectionEngineComponentProps) => {
  return (
    <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules/rule-details/edit-rule${search}`} />
  );
};

export const getDetectionEngineUrl = () => `#/link-to/${DETECTION_ENGINE_PAGE_NAME}`;
export const getRulesUrl = () => `#/link-to/${DETECTION_ENGINE_PAGE_NAME}/rules`;
export const getCreateRuleUrl = () => `#/link-to/${DETECTION_ENGINE_PAGE_NAME}/rules/create-rule`;
export const getRuleDetailsUrl = () => `#/link-to/${DETECTION_ENGINE_PAGE_NAME}/rules/rule-details`;
export const getEditRuleUrl = () =>
  `#/link-to/${DETECTION_ENGINE_PAGE_NAME}/rules/rule-details/edit-rule`;
