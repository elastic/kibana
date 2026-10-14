/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Adapters } from '@kbn/inspector-plugin/common/adapters';
import { EuiSpacer } from '@elastic/eui';
import { useErrorTextStyle } from '@kbn/react-hooks';
import { KbnDangerCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { ILayer } from '../../../../../classes/layers/layer';

interface Props {
  inspectorAdapters: Adapters;
  layer: ILayer;
}

export function LegendDetails({ inspectorAdapters, layer }: Props) {
  const errorTextStyle = useErrorTextStyle();

  const errors = layer.getErrors(inspectorAdapters);
  if (errors.length) {
    return (
      <>
        {errors.map(({ title, body }, index) => (
          <div key={index}>
            <KbnDangerCallout announceOnMount size="s" title={title} css={errorTextStyle}>
              {body}
            </KbnDangerCallout>
            <EuiSpacer size="m" />
          </div>
        ))}
      </>
    );
  }

  const warnings = layer.getWarnings();
  return warnings.length ? (
    <>
      {warnings.map(({ title, body }, index) => (
        <div key={index}>
          <KbnWarningCallout announceOnMount size="s" title={title} css={errorTextStyle}>
            {body}
          </KbnWarningCallout>
          <EuiSpacer size="m" />
        </div>
      ))}
      {layer.renderLegendDetails()}
    </>
  ) : (
    layer.renderLegendDetails()
  );
}
