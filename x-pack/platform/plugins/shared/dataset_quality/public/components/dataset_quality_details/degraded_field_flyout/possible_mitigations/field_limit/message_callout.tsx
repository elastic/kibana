/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import {
  fieldLimitMitigationFailedMessage,
  fieldLimitMitigationFailedMessageDescription,
  fieldLimitMitigationPartiallyFailedMessage,
  fieldLimitMitigationPartiallyFailedMessageDescription,
  fieldLimitMitigationRolloverButton,
  fieldLimitMitigationSuccessComponentTemplateLinkText,
  fieldLimitMitigationSuccessMessage,
} from '../../../../../../common/translations';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../../../hooks';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../../../common/utils/component_template_name';
import { useKibanaContextForPlugin } from '../../../../../utils';

export function MessageCallout() {
  const {
    isMitigationInProgress,
    newFieldLimitData,
    isRolloverRequired,
    isMitigationAppliedSuccessfully,
  } = useDegradedFields();
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
    <EuiCallOut
      title={fieldLimitMitigationSuccessMessage}
      color="success"
      iconType="checkInCircleFilled"
      data-test-subj="datasetQualityDetailsDegradedFlyoutNewLimitSetSuccessCallout"
    >
      <EuiLink
        data-test-subj="datasetQualityDetailsDegradedFlyoutNewLimitSetCheckComponentTemplate"
        href={componentTemplateUrl}
        target="_blank"
        color="success"
      >
        {fieldLimitMitigationSuccessComponentTemplateLinkText}
      </EuiLink>
    </EuiCallOut>
  );
}

export function ManualRolloverCallout() {
  const { triggerRollover, isRolloverInProgress } = useDegradedFields();
  return (
    <EuiCallOut
      title={fieldLimitMitigationPartiallyFailedMessage}
      color="danger"
      iconType="checkInCircleFilled"
    >
      <p>{fieldLimitMitigationPartiallyFailedMessageDescription}</p>
      <EuiButton
        data-test-subj="datasetQualityNewLimitSetManualRollover"
        onClick={triggerRollover}
        iconType="popout"
        size="s"
        title={fieldLimitMitigationRolloverButton}
        color="danger"
        isLoading={isRolloverInProgress}
      >
        {fieldLimitMitigationRolloverButton}
      </EuiButton>
    </EuiCallOut>
  );
}

export function ErrorCallout() {
  return (
    <EuiCallOut
      title={fieldLimitMitigationFailedMessage}
      color="danger"
      iconType="error"
      data-test-subj="datasetQualityDetailsNewFieldLimitErrorCallout"
    >
      <p>{fieldLimitMitigationFailedMessageDescription}</p>
    </EuiCallOut>
  );
}
