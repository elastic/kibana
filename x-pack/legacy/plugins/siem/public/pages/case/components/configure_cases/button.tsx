/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { memo, useMemo } from 'react';
import { getConfigureCasesUrl } from '../../../../components/link_to';

interface ConfigureCaseButtonProps {
  label: string;
  isDisabled: boolean;
  msgTooltip: JSX.Element;
  showToolTip: boolean;
  titleTooltip: string;
  urlSearch: string;
}

const ConfigureCaseButtonComponent: React.FC<ConfigureCaseButtonProps> = ({
  isDisabled,
  label,
  msgTooltip,
  showToolTip,
  titleTooltip,
  urlSearch,
}: ConfigureCaseButtonProps) => {
  const configureCaseButton = useMemo(
    () => (
      <EuiButton
        href={getConfigureCasesUrl(urlSearch)}
        iconType="controlsHorizontal"
        isDisabled={isDisabled}
        aria-label={label}
      >
        {label}
      </EuiButton>
    ),
    [label, isDisabled, urlSearch]
  );
  return showToolTip ? (
    <EuiToolTip position="top" title={titleTooltip} content={<p>{msgTooltip}</p>}>
      {configureCaseButton}
    </EuiToolTip>
  ) : (
    <>{configureCaseButton}</>
  );
};

export const ConfigureCaseButton = memo(ConfigureCaseButtonComponent);
