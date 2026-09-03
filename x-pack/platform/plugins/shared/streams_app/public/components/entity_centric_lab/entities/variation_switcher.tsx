/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Floating bottom-right popover that lets you switch between prototype
 * variations (data profiles, UI alternatives, …). ElasticOn-only.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useVariationContext } from './variation_context';
import type { VariationDimension } from './variation_registry';

// ---------------------------------------------------------------------------
// Per-dimension row
// ---------------------------------------------------------------------------

const DimensionRow = ({
  dimension,
  activeOptionId,
  onChange,
}: {
  dimension: VariationDimension;
  activeOptionId: string;
  onChange: (dimensionId: string, optionId: string) => void;
}) => {
  const buttonGroupOptions = useMemo(
    () =>
      dimension.options.map((opt) => ({
        id: opt.id,
        label: opt.label,
      })),
    [dimension.options]
  );

  const handleChange = useCallback(
    (optionId: string) => onChange(dimension.id, optionId),
    [dimension.id, onChange]
  );

  const activeDescription = dimension.options.find(
    (opt) => opt.id === activeOptionId
  )?.description;

  return (
    <EuiFormRow label={dimension.label} fullWidth>
      <>
        <EuiButtonGroup
          legend={dimension.label}
          options={buttonGroupOptions}
          idSelected={activeOptionId}
          onChange={handleChange}
          buttonSize="compressed"
          isFullWidth
        />
        {activeDescription ? (
          <EuiText size="xs" color="subdued" css={css`margin-top: 4px;`}>
            <p>{activeDescription}</p>
          </EuiText>
        ) : null}
      </>
    </EuiFormRow>
  );
};

// ---------------------------------------------------------------------------
// Floating switcher button + popover
// ---------------------------------------------------------------------------

export const VariationSwitcher = () => {
  const { euiTheme } = useEuiTheme();
  const { get, set, dimensions } = useVariationContext();
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Highlight the button when any dimension is non-default, so the user
  // knows the prototype is in a non-standard configuration.
  const hasNonDefault = dimensions.some(
    (dim) => get(dim.id) !== dim.defaultOption
  );

  return (
    <div
      css={css`
        position: fixed;
        bottom: ${euiTheme.size.l};
        right: ${euiTheme.size.l};
        z-index: ${euiTheme.levels.flyout - 1};
      `}
    >
      <EuiPopover
        button={
          <EuiButtonIcon
            iconType="beaker"
            aria-label="Prototype variations"
            display={hasNonDefault ? 'fill' : 'base'}
            color={hasNonDefault ? 'accent' : 'text'}
            size="m"
            onClick={toggle}
            css={css`
              border-radius: 50%;
              box-shadow: ${euiTheme.levels.flyout > 0
                ? `0 2px 8px ${euiTheme.colors.shadow}`
                : 'none'};
            `}
          />
        }
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="upRight"
        panelPaddingSize="m"
        css={css`
          & .euiPopover__anchor {
            display: flex;
          }
        `}
      >
        <EuiPopoverTitle>Prototype variations</EuiPopoverTitle>
        <EuiFlexGroup
          direction="column"
          gutterSize="m"
          css={css`
            min-width: 280px;
          `}
        >
          {dimensions.map((dim) => (
            <EuiFlexItem key={dim.id} grow={false}>
              <DimensionRow
                dimension={dim}
                activeOptionId={get(dim.id)}
                onChange={set}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPopover>
    </div>
  );
};
