/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  euiPaletteColorBlind,
  euiPaletteColorBlindBehindText,
  useEuiFontSize,
  useEuiTheme,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { NerInference, NerResponse } from './ner_inference';
import { INPUT_TYPE } from '../inference_base';

const badgeColorPaletteBorder = euiPaletteColorBlind();
const badgeColorPaletteBehindText = euiPaletteColorBlindBehindText();

const ICON_PADDING = '2px';
const PROBABILITY_SIG_FIGS = 3;

interface EntityType {
  label: string;
  icon: string;
  colorIndex: number;
}

const ENTITY_TYPE_NAMES = ['PER', 'LOC', 'ORG', 'MISC'] as const;
const isEntityTypeName = (name: string): name is EntityTypeName =>
  ENTITY_TYPE_NAMES.includes(name as EntityTypeName);
type EntityTypeName = (typeof ENTITY_TYPE_NAMES)[number];

const ENTITY_TYPES: Record<EntityTypeName, EntityType> = {
  PER: {
    label: 'Person',
    icon: 'user',
    // Amsterdam color
    colorIndex: 5,
  },
  LOC: {
    label: 'Location',
    icon: 'visMapCoordinate',
    // Amsterdam color
    colorIndex: 1,
  },
  ORG: {
    label: 'Organization',
    icon: 'home',
    // Amsterdam color
    colorIndex: 0,
  },
  MISC: {
    label: 'Miscellaneous',
    icon: 'question',
    // Amsterdam color
    colorIndex: 7,
  },
};

const UNKNOWN_ENTITY_TYPE: EntityType = {
  label: '',
  icon: 'question',
  // Amsterdam color
  colorIndex: 5,
};

// Amsterdam
// ['#6dccb1', '#79aad9', '#ee789d', '#a987d1', '#e4a6c7', '#f1d86f', '#d2c0a0', '#f5a35c', '#c47c6c', '#ff7e62']
// Borealis
// ['#00BEB8', '#98E6E2', '#599DFF', '#B4D5FF', '#ED6BA2', '#FFBED5', '#F66D64', '#FFC0B8', '#E6AB01', '#FCD279']
const amsterdam2BorealisColorMap = new Map<number, number>([
  [0, 0],
  [1, 2],
  [5, 9],
  [7, 8],
]);

export const getNerOutputComponent = (inferrer: NerInference) => <NerOutput inferrer={inferrer} />;

const NerOutput: FC<{ inferrer: NerInference }> = ({ inferrer }) => {
  const result = useObservable(inferrer.getInferenceResult$(), inferrer.getInferenceResult());

  if (!result) {
    return null;
  }

  if (inferrer.getInputType() === INPUT_TYPE.INDEX) {
    return (
      <>
        {result.map((r) => (
          <>
            <Lines result={r} />
            <EuiHorizontalRule />
          </>
        ))}
      </>
    );
  }

  return <Lines result={result[0]} />;
};

const Lines: FC<{ result: NerResponse }> = ({ result }) => {
  const euiFontSizeXS = useEuiFontSize('xs', { unit: 'px' }).fontSize as string;
  const lineSplit: JSX.Element[] = [];
  result.response.forEach(({ value, entity }) => {
    if (entity === null) {
      const lines = value
        .split(/(\n)/)
        .map((line) => (line === '\n' ? <br /> : <span>{line}</span>));

      lineSplit.push(...lines);
    } else {
      lineSplit.push(
        <EuiToolTip
          position="top"
          content={
            <div>
              <div>
                <EuiIcon
                  size="m"
                  type={getClassIcon(entity.class_name)}
                  style={{ marginRight: ICON_PADDING, verticalAlign: 'text-top' }}
                />
                {value}
              </div>
              <EuiHorizontalRule margin="none" />
              <div style={{ fontSize: euiFontSizeXS, marginTop: ICON_PADDING }}>
                <div>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.ner.output.typeTitle"
                    defaultMessage="Type"
                  />
                  : {getClassLabel(entity.class_name)}
                </div>
                <div>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.testModelsFlyout.ner.output.probabilityTitle"
                    defaultMessage="Probability"
                  />
                  : {Number(entity.class_probability).toPrecision(PROBABILITY_SIG_FIGS)}
                </div>
              </div>
            </div>
          }
        >
          <EntityBadge entity={entity}>{value}</EntityBadge>
        </EuiToolTip>
      );
    }
  });
  return <div style={{ lineHeight: '24px' }}>{lineSplit}</div>;
};

const EntityBadge = ({
  entity,
  children,
}: PropsWithChildren<{
  entity: estypes.MlTrainedModelEntities;
}>) => {
  const { euiTheme } = useEuiTheme();
  const euiFontSizeXS = useEuiFontSize('xs').fontSize;

  return (
    <EuiBadge
      color={getClassColor(entity.class_name, euiTheme.flags.hasVisColorAdjustment)}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
        // For Amsterdam, add a border to the badge to improve contrast with the background.
        ...(euiTheme.flags.hasVisColorAdjustment
          ? {
              border: `1px solid ${getClassColor(
                entity.class_name,
                euiTheme.flags.hasVisColorAdjustment,
                true
              )}`,
            }
          : {}),
        fontSize: euiFontSizeXS,
        padding: '0px 6px',
        pointerEvents: 'none',
      }}
    >
      <EuiFlexGroup gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiIcon
            size="s"
            type={getClassIcon(entity.class_name)}
            style={{ marginRight: ICON_PADDING, marginTop: ICON_PADDING }}
          />
        </EuiFlexItem>
        <EuiFlexItem>{children}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiBadge>
  );
};

export function getClassIcon(className: string) {
  const entity = ENTITY_TYPES[className as keyof typeof ENTITY_TYPES];
  return entity?.icon ?? UNKNOWN_ENTITY_TYPE.icon;
}

export function getClassLabel(className: string) {
  const entity = ENTITY_TYPES[className as keyof typeof ENTITY_TYPES];
  return entity?.label ?? className;
}

export function getClassColor(
  className: string,
  hasVisColorAdjustment: boolean,
  border: boolean = false
) {
  const colorIndex = isEntityTypeName(className)
    ? ENTITY_TYPES[className].colorIndex
    : UNKNOWN_ENTITY_TYPE.colorIndex;

  // map colors from Amsterdam to Borealis if necessary
  const themeColorIndex = hasVisColorAdjustment
    ? colorIndex
    : amsterdam2BorealisColorMap.get(colorIndex) ?? colorIndex;

  return border
    ? badgeColorPaletteBorder[themeColorIndex]
    : badgeColorPaletteBehindText[themeColorIndex];
}
