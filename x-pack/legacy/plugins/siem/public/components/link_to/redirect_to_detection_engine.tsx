/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { DetectionEngineTab } from '../../pages/detection_engine/types';
import { RedirectWrapper } from './redirect_wrapper';

export type DetectionEngineComponentProps = RouteComponentProps<{
  tabName: DetectionEngineTab;
  search: string;
}>;

export const DETECTION_ENGINE_PAGE_NAME = 'detections';

export const RedirectToDetectionEnginePage = ({
  match: {
    params: { tabName },
  },
  location: { search },
}: DetectionEngineComponentProps) => {
  const defaultSelectedTab = DetectionEngineTab.signals;
  const selectedTab = tabName ? tabName : defaultSelectedTab;
  const to = `/${DETECTION_ENGINE_PAGE_NAME}/${selectedTab}${search}`;

  return <RedirectWrapper to={to} />;
};

export const RedirectToRulesPage = ({ location: { search } }: DetectionEngineComponentProps) => {
  return <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules${search}`} />;
};

export const RedirectToCreateRulePage = ({
  location: { search },
}: DetectionEngineComponentProps) => {
  return <RedirectWrapper to={`/${DETECTION_ENGINE_PAGE_NAME}/rules/create${search}`} />;
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

const baseDetectionEngineUrl = `#/link-to/${DETECTION_ENGINE_PAGE_NAME}`;

export const getDetectionEngineUrl = () => `${baseDetectionEngineUrl}`;
export const getDetectionEngineAlertUrl = () =>
  `${baseDetectionEngineUrl}/${DetectionEngineTab.alerts}`;
export const getDetectionEngineTabUrl = (tabPath: string) => `${baseDetectionEngineUrl}/${tabPath}`;
export const getRulesUrl = () => `${baseDetectionEngineUrl}/rules`;
export const getCreateRuleUrl = () => `${baseDetectionEngineUrl}/rules/create`;
export const getRuleDetailsUrl = (detailName: string) =>
  `${baseDetectionEngineUrl}/rules/id/${detailName}`;
export const getEditRuleUrl = (detailName: string) =>
  `${baseDetectionEngineUrl}/rules/id/${detailName}/edit`;
