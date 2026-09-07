/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout, KbnSuccessCallout } from '@kbn/ui-callout';
import {
  fieldLimitMitigationFailedMessage,
  fieldLimitMitigationFailedMessageDescription,
  fieldLimitMitigationPartiallyFailedMessage,
  fieldLimitMitigationPartiallyFailedMessageDescription,
  fieldLimitMitigationRolloverButton,
  fieldLimitMitigationSuccessComponentTemplateLinkText,
  fieldLimitMitigationSuccessMessage,
} from '../../../../../../../common/translations';
import { useDatasetQualityDetailsState, useQualityIssues } from '../../../../../../hooks';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../../../../common/utils/component_template_name';
import { useKibanaContextForPlugin } from '../../../../../../utils';

export function MessageCallout() {
  const {
    isMitigationInProgress,
    newFieldLimitData,
    isRolloverRequired,
    isMitigationAppliedSuccessfully,
  } = useQualityIssues();
  const { error: serverError } = newFieldLimitData ?? {};

  if (serverError) {
    return <ErrorCallout />;
  }

  if (!isMitigationInProgress && isRolloverRequired) {
    return <ManualRolloverCallout />;
  }

  if (!isMitigationInProgress && isMitigationAppliedSuccessfully) {
    return <SuccessCallout />;
  }

  return null;
}

export function SuccessCallout() {
  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();
  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const componentTemplateUrl = locators.get('INDEX_MANAGEMENT_LOCATOR_ID')?.useUrl({
    page: 'component_template',
    componentTemplate: `${getComponentTemplatePrefixFromIndexTemplate(
      dataStreamSettings?.indexTemplate ?? name
    )}@custom`,
  });

  return (
    <KbnSuccessCallout
      title={fieldLimitMitigationSuccessMessage}
      data-test-subj="datasetQualityDetailsDegradedFlyoutNewLimitSetSuccessCallout"
      actionProps={{
        primary: {
          'data-test-subj': 'datasetQualityDetailsDegradedFlyoutNewLimitSetCheckComponentTemplate',
          href: componentTemplateUrl,
          target: '_blank',
          children: fieldLimitMitigationSuccessComponentTemplateLinkText,
        },
      }}
    />
  );
}

export function ManualRolloverCallout() {
  const { triggerRollover, isRolloverInProgress } = useQualityIssues();
  return (
    <KbnDangerCallout
      title={fieldLimitMitigationPartiallyFailedMessage}
      text={fieldLimitMitigationPartiallyFailedMessageDescription}
      actionProps={{
        primary: {
          'data-test-subj': 'datasetQualityNewLimitSetManualRollover',
          onClick: triggerRollover,
          iconType: 'external',
          title: fieldLimitMitigationRolloverButton,
          isLoading: isRolloverInProgress,
          children: fieldLimitMitigationRolloverButton,
        },
      }}
    />
  );
}

export function ErrorCallout() {
  return (
    <KbnDangerCallout
      title={fieldLimitMitigationFailedMessage}
      data-test-subj="datasetQualityDetailsNewFieldLimitErrorCallout"
      text={fieldLimitMitigationFailedMessageDescription}
    />
  );
}
