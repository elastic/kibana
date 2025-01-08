/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiCodeBlock,
  EuiText,
  EuiPanel,
  EuiSpacer,
} from '@elastic/eui';
import { type State } from '../../state';
import * as i18n from './translations';

interface CelConfigResultsProps {
  celInputResult: State['celInputResult'];
}

export const CelConfigResults = React.memo<CelConfigResultsProps>(({ celInputResult }) => {
  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            <h4>{i18n.PROGRAM}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="c" fontSize="m" isCopyable>
            {celInputResult?.program}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            <h4>{i18n.STATE}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="json" fontSize="m" isCopyable>
            {JSON.stringify(celInputResult?.stateSettings, null, 2)}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiText size="s">
            <h4>{i18n.REDACT_VARS}</h4>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiCodeBlock language="json" fontSize="m" isCopyable>
            {JSON.stringify(celInputResult?.redactVars)}
          </EuiCodeBlock>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
CelConfigResults.displayName = 'CelConfigForm';
