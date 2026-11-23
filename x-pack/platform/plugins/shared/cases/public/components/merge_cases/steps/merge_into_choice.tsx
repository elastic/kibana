/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiRadio,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { MergeInto } from '../utils';
import * as i18n from '../translations';

const PICTURE_BAND_HEIGHT = 124;

/** How much shorter the choice gets when compact, with its pictures gone. */
export const MERGE_INTO_COMPACT_SAVING = PICTURE_BAND_HEIGHT;

/** A small card for one of the cases being merged. */
const SourceCard: React.FC<{ x?: number; y: number; width?: number }> = ({
  x = 8,
  y,
  width = 64,
}) => {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <rect
        x={x}
        y={y}
        width={width}
        height="22"
        rx="4"
        fill={euiTheme.colors.backgroundBasePlain}
        stroke={euiTheme.colors.borderBasePlain}
      />
      <path
        d={`M${x + 8} ${y + 8} H${x + width - 18} M${x + 8} ${y + 14} H${x + width - 32}`}
        stroke={euiTheme.colors.borderBasePlain}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </>
  );
};

SourceCard.displayName = 'SourceCard';

/** Three cases flowing into a new, dashed case. */
const NewCasePicture: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  return (
    <svg aria-hidden={true} width="220" height="104" viewBox="0 0 220 104" fill="none">
      <SourceCard y={10} />
      <SourceCard y={41} />
      <SourceCard y={72} />
      <path
        d="M76 21 C108 21 112 52 140 52 M76 52 H140 M76 83 C108 83 112 52 140 52"
        stroke={colors.textSubdued}
        strokeWidth="1.5"
      />
      <path
        d="M135 47 L141 52 L135 57"
        stroke={colors.textSubdued}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="148"
        y="22"
        width="64"
        height="60"
        rx="6"
        fill={colors.backgroundLightPrimary}
        stroke={colors.primary}
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <path
        d="M180 40 V64 M168 52 H192"
        stroke={colors.primary}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

NewCasePicture.displayName = 'NewCasePicture';

/**
 * The same stack of cases as the new-case picture, but the middle one is kept: the top and bottom
 * cases flow into it, and nothing new appears.
 */
const ExistingCasePicture: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;
  return (
    <svg aria-hidden={true} width="220" height="104" viewBox="0 0 220 104" fill="none">
      <SourceCard x={70} y={4} width={96} />
      <rect
        x="60"
        y="36"
        width="116"
        height="32"
        rx="5"
        fill={colors.backgroundLightPrimary}
        stroke={colors.primary}
        strokeWidth="1.5"
      />
      <path
        d="M70 47 H150 M70 55 H130"
        stroke={colors.borderBasePrimary}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="176" cy="36" r="9" fill={colors.primary} />
      <path
        d="M172 36 L175 39 L180 33"
        stroke={colors.backgroundBasePlain}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SourceCard x={70} y={78} width={96} />
      <path
        d="M68 15 C38 15 34 52 56 52 M68 89 C38 89 34 52 56 52"
        stroke={colors.textSubdued}
        strokeWidth="1.5"
      />
      <path
        d="M51 47 L57 52 L51 57"
        stroke={colors.textSubdued}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

ExistingCasePicture.displayName = 'ExistingCasePicture';

interface TileProps {
  id: string;
  name: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  picture: React.ReactNode;
  isCompact: boolean;
  testSubj: string;
}

/** One way to merge: a picture of it, and a radio with its title and what it does. */
const Tile: React.FC<TileProps> = ({
  id,
  name,
  checked,
  disabled,
  onSelect,
  title,
  description,
  picture,
  isCompact,
  testSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const { colors } = euiTheme;

  return (
    <div
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        border: ${euiTheme.border.thin};
        border-radius: ${euiTheme.border.radius.medium};
        overflow: hidden;
        background: ${colors.backgroundBasePlain};
        ${checked
          ? `border-color: ${colors.primary}; box-shadow: 0 0 0 1px ${colors.primary};`
          : ''}
        ${disabled ? 'opacity: 0.6;' : ''}
      `}
      data-test-subj={testSubj}
    >
      {/* A second label for the radio, so the picture picks the tile too. */}
      <label
        htmlFor={id}
        css={css`
          display: flex;
          align-items: center;
          justify-content: center;
          height: ${isCompact ? 0 : PICTURE_BAND_HEIGHT}px;
          overflow: hidden;
          background: ${checked ? colors.backgroundLightPrimary : colors.backgroundBaseSubdued};
          border-bottom: ${euiTheme.border.width.thin} solid
            ${isCompact ? 'transparent' : euiTheme.border.color};
          cursor: ${disabled ? 'not-allowed' : 'pointer'};
          ${euiCanAnimate} {
            transition: height ${euiTheme.animation.normal} ${euiTheme.animation.resistance},
              border-color ${euiTheme.animation.normal} ${euiTheme.animation.resistance};
          }
        `}
      >
        {picture}
      </label>
      <div
        css={css`
          padding: ${euiTheme.size.m};
        `}
      >
        <EuiRadio
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onSelect}
          label={
            <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>{title}</strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {description}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </div>
    </div>
  );
};
Tile.displayName = 'Tile';

export interface MergeIntoChoiceProps {
  mergeInto: MergeInto;
  canCreate: boolean;
  /** False when every case is closed, so none can be kept. */
  hasOpenCase: boolean;
  onSetMergeInto: (mergeInto: MergeInto) => void;
  /** Without the pictures, while the cases below scroll. */
  isCompact: boolean;
  isDisabled: boolean;
}

/** The first choice: merge into a new case (the default), or into one of the cases. */
export const MergeIntoChoice = React.memo<MergeIntoChoiceProps>(
  ({ mergeInto, canCreate, hasOpenCase, onSetMergeInto, isCompact, isDisabled }) => {
    const name = useGeneratedHtmlId({ prefix: 'mergeInto' });

    return (
      <fieldset
        css={css`
          border: 0;
          margin: 0;
          padding: 0;
          min-width: 0;
        `}
        data-test-subj="merge-cases-merge-into"
      >
        {/* The tiles say what each choice does; the group only needs a name for screen readers. */}
        <legend className="euiScreenReaderOnly">{i18n.MERGE_INTO_LEGEND}</legend>
        <EuiFlexGroup gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <Tile
              id={`${name}-new`}
              name={name}
              checked={mergeInto === 'new'}
              disabled={isDisabled || !canCreate}
              onSelect={() => onSetMergeInto('new')}
              title={i18n.MERGE_INTO_NEW_TITLE}
              description={
                canCreate ? i18n.MERGE_INTO_NEW_DESCRIPTION : i18n.NEW_CASE_NO_PERMISSION
              }
              picture={<NewCasePicture />}
              isCompact={isCompact}
              testSubj="merge-cases-merge-into-new"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <Tile
              id={`${name}-existing`}
              name={name}
              checked={mergeInto === 'existing'}
              disabled={isDisabled || !hasOpenCase}
              onSelect={() => onSetMergeInto('existing')}
              title={i18n.MERGE_INTO_EXISTING_TITLE}
              description={
                hasOpenCase
                  ? i18n.MERGE_INTO_EXISTING_DESCRIPTION
                  : i18n.MERGE_INTO_EXISTING_NONE_OPEN
              }
              picture={<ExistingCasePicture />}
              isCompact={isCompact}
              testSubj="merge-cases-merge-into-existing"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </fieldset>
    );
  }
);
MergeIntoChoice.displayName = 'MergeIntoChoice';
