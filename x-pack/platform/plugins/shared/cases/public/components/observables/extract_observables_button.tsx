/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import type { CaseUI } from '../../../common';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { useExtractObservables } from '../../containers/use_extract_observables';
import * as i18n from './translations';

export interface ExtractObservablesButtonProps {
  caseData: CaseUI;
  /** Disables the button while another action on the case runs. */
  isDisabled?: boolean;
}

/**
 * Extracts observables from the alerts and events attached to the case on demand. Users without
 * the update permission do not see the button. It is disabled when auto-extract is off for the case.
 */
const ExtractObservablesButtonComponent: React.FC<ExtractObservablesButtonProps> = ({
  caseData,
  isDisabled = false,
}) => {
  const { permissions } = useCasesContext();
  const { observablesAuthorized, isExtractObservablesEnabled } = useCasesFeatures();
  const { mutate: extractObservables, isLoading } = useExtractObservables(caseData.id);

  const handleClick = useCallback(() => {
    extractObservables();
  }, [extractObservables]);

  if (!permissions.update || !observablesAuthorized || !isExtractObservablesEnabled) {
    return null;
  }

  const isExtractionOn = caseData.settings.extractObservables ?? false;

  return (
    <EuiFlexItem grow={false}>
      <EuiToolTip
        content={isExtractionOn ? undefined : i18n.EXTRACT_OBSERVABLES_DISABLED_TOOLTIP}
        anchorProps={{ 'data-test-subj': 'cases-observables-extract-tooltip-anchor' }}
      >
        <EuiButton
          iconType="refresh"
          isDisabled={!isExtractionOn || isDisabled}
          isLoading={isLoading}
          onClick={handleClick}
          data-test-subj="cases-observables-extract"
        >
          {i18n.EXTRACT_OBSERVABLES_BUTTON}
        </EuiButton>
      </EuiToolTip>
    </EuiFlexItem>
  );
};

ExtractObservablesButtonComponent.displayName = 'ExtractObservablesButton';

export const ExtractObservablesButton = React.memo(ExtractObservablesButtonComponent);
