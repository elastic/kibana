/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { debounce } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import { useVisibilityState } from '../../utils/use_visibility_state';

interface LogHighlightsMenuProps {
  onChange: (highlightTerms: string[]) => void;
  isLoading: boolean;
  activeHighlights: boolean;
}

export const LogHighlightsMenu: React.FC<LogHighlightsMenuProps> = ({
  onChange,
  isLoading,
  activeHighlights,
}) => {
  const {
    isVisible: isPopoverOpen,
    hide: closePopover,
    toggle: togglePopover,
  } = useVisibilityState(false);

  // Input field state
  const [highlightTerm, setHighlightTerm] = useState('');
  const debouncedOnChange = useMemo(() => debounce(onChange, 275), [onChange]);
  const changeHighlightTerm = useCallback(
    e => {
      const value = e.target.value;
      setHighlightTerm(value);
    },
    [setHighlightTerm]
  );
  const clearHighlightTerm = useCallback(() => setHighlightTerm(''), [setHighlightTerm]);
  useEffect(() => {
    debouncedOnChange([highlightTerm]);
  }, [highlightTerm]);

  const button = (
    <EuiButtonEmpty color="text" size="xs" iconType="brush" onClick={togglePopover}>
      <FormattedMessage
        id="xpack.infra.logs.highlights.highlightsPopoverButtonLabel"
        defaultMessage="Highlights"
      />
      {activeHighlights ? <ActiveHighlightsIndicator /> : null}
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      id="popover"
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      ownFocus
    >
      <LogHighlightsMenuContent>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem>
            <EuiFieldText
              placeholder={termsFieldLabel}
              fullWidth={true}
              value={highlightTerm}
              onChange={changeHighlightTerm}
              isLoading={isLoading}
              aria-label={termsFieldLabel}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              aria-label={clearTermsButtonLabel}
              color="danger"
              iconType="trash"
              onClick={clearHighlightTerm}
              title={clearTermsButtonLabel}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </LogHighlightsMenuContent>
    </EuiPopover>
  );
};

const termsFieldLabel = i18n.translate('xpack.infra.logs.highlights.highlightTermsFieldLabel', {
  defaultMessage: 'Terms to highlight',
});

const clearTermsButtonLabel = i18n.translate(
  'xpack.infra.logs.highlights.clearHighlightTermsButtonLabel',
  {
    defaultMessage: 'Clear terms to highlight',
  }
);

const ActiveHighlightsIndicator = euiStyled(EuiIcon).attrs({
  type: 'checkInCircleFilled',
  size: 'm',
  color: props => props.theme.eui.euiColorAccent,
})`
  padding-left: ${props => props.theme.eui.paddingSizes.xs};
`;

const LogHighlightsMenuContent = euiStyled.div`
  width: 300px;
`;
