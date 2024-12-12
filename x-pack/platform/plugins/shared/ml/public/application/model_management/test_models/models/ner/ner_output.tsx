/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  useEuiFontSize,
  useEuiTheme,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiToolTip,
  type EuiThemeComputed,
} from '@elastic/eui';
import type { NerInference, NerResponse } from './ner_inference';
import { INPUT_TYPE } from '../inference_base';

type EuiVisColor = keyof EuiThemeComputed['colors']['vis'];

const ICON_PADDING = '2px';
const PROBABILITY_SIG_FIGS = 3;

interface EntityType {
  label: string;
  icon: string;
  color: EuiVisColor;
}

const ENTITY_TYPE_NAMES = ['PER', 'LOC', 'ORG', 'MISC'] as const;
const isEntityTypeName = (name: string): name is EntityTypeName =>
  ENTITY_TYPE_NAMES.includes(name as EntityTypeName);
type EntityTypeName = (typeof ENTITY_TYPE_NAMES)[number];

const ENTITY_TYPES: Record<EntityTypeName, EntityType> = {
  PER: {
    label: 'Person',
    icon: 'user',
    color: 'euiColorVis5',
  },
  LOC: {
    label: 'Location',
    icon: 'visMapCoordinate',
    color: 'euiColorVis1',
  },
  ORG: {
    label: 'Organization',
    icon: 'home',
    color: 'euiColorVis0',
  },
  MISC: {
    label: 'Miscellaneous',
    icon: 'questionInCircle',
    color: 'euiColorVis7',
  },
};

const UNKNOWN_ENTITY_TYPE: EntityType = {
  label: '',
  icon: 'questionInCircle',
  color: 'euiColorVis5',
};

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
  const color = getClassColor(euiTheme, entity.class_name);
  return (
    <EuiBadge
      color={color}
      style={{
        marginRight: ICON_PADDING,
        marginTop: `-${ICON_PADDING}`,
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

export function getClassColor(euiTheme: EuiThemeComputed, className: string) {
  const color = isEntityTypeName(className)
    ? ENTITY_TYPES[className].color
    : UNKNOWN_ENTITY_TYPE.color;
  return euiTheme.colors.vis[color];
}
