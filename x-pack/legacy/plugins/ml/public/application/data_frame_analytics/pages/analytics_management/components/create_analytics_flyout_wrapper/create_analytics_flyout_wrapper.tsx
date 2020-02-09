/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { CreateAnalyticsFormProps } from '../../hooks/use_create_analytics_form';

import { CreateAnalyticsAdvancedEditor } from '../create_analytics_advanced_editor';
import { CreateAnalyticsForm } from '../create_analytics_form';
import { CreateAnalyticsFlyout } from '../create_analytics_flyout';

export const CreateAnalyticsFlyoutWrapper: FC<CreateAnalyticsFormProps> = props => {
  const { isAdvancedEditorEnabled, isModalVisible } = props.state;

  if (isModalVisible === false) {
    return null;
  }

  return (
    <CreateAnalyticsFlyout {...props}>
      {isAdvancedEditorEnabled === false && <CreateAnalyticsForm {...props} />}
      {isAdvancedEditorEnabled === true && <CreateAnalyticsAdvancedEditor {...props} />}
    </CreateAnalyticsFlyout>
  );
};
