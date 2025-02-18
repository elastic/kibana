/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-plugin/common';
import { getGeoFields, getGeoPointFields } from '../../../../../index_pattern_util';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { LeftSourcePanel } from './left_source_panel';
import { RightSourcePanel } from './right_source_panel';
import { createDistanceJoinLayerDescriptor } from './create_spatial_join_layer_descriptor';
import { DEFAULT_WITHIN_DISTANCE } from '../../../../sources/join_sources';

function isLeftConfigComplete(
  leftDataView: DataView | undefined,
  leftGeoField: string | undefined
) {
  return leftDataView !== undefined && leftDataView.id && leftGeoField !== undefined;
}

function isRightConfigComplete(
  rightDataView: DataView | undefined,
  rightGeoField: string | undefined
) {
  return rightDataView !== undefined && rightDataView.id && rightGeoField !== undefined;
}

export function WizardForm({ previewLayers }: RenderWizardArguments) {
  const [distance, setDistance] = useState<number>(DEFAULT_WITHIN_DISTANCE);
  const [leftDataView, setLeftDataView] = useState<DataView | undefined>();
  const [leftGeoFields, setLeftGeoFields] = useState<DataViewField[]>([]);
  const [leftGeoField, setLeftGeoField] = useState<string | undefined>();
  const [rightDataView, setRightDataView] = useState<DataView | undefined>();
  const [rightGeoFields, setRightGeoFields] = useState<DataViewField[]>([]);
  const [rightGeoField, setRightGeoField] = useState<string | undefined>();

  useEffect(() => {
    if (
      !isLeftConfigComplete(leftDataView, leftGeoField) ||
      !isRightConfigComplete(rightDataView, rightGeoField)
    ) {
      previewLayers([]);
      return;
    }

    const layerDescriptor = createDistanceJoinLayerDescriptor({
      distance,
      leftDataViewId: leftDataView!.id!, // leftDataView.id verified in isLeftConfigComplete
      leftGeoField: leftGeoField!, // leftGeoField verified in isLeftConfigComplete
      rightDataViewId: rightDataView!.id!, // rightDataView.id verified in isRightConfigComplete
      rightGeoField: rightGeoField!, // rightGeoField verified in isRightConfigComplete
    });

    previewLayers([layerDescriptor]);
  }, [distance, leftDataView, leftGeoField, rightDataView, rightGeoField, previewLayers]);

  const rightSourcePanel = isLeftConfigComplete(leftDataView, leftGeoField) ? (
    <RightSourcePanel
      dataView={rightDataView}
      distance={distance}
      geoField={rightGeoField}
      geoFields={rightGeoFields}
      onDataViewSelect={(dataView: DataView) => {
        setRightDataView(dataView);
        const geoFields = getGeoFields(dataView.fields);
        setRightGeoFields(geoFields);
        setRightGeoField(geoFields.length ? geoFields[0].name : undefined);
      }}
      onDistanceChange={setDistance}
      onGeoFieldSelect={setRightGeoField}
    />
  ) : null;

  return (
    <>
      <LeftSourcePanel
        dataView={leftDataView}
        geoField={leftGeoField}
        geoFields={leftGeoFields}
        onDataViewSelect={(dataView: DataView) => {
          setLeftDataView(dataView);
          const geoFields = getGeoPointFields(dataView.fields);
          setLeftGeoFields(geoFields);
          setLeftGeoField(geoFields.length ? geoFields[0].name : undefined);
        }}
        onGeoFieldSelect={setLeftGeoField}
      />

      <EuiSpacer size="s" />

      {rightSourcePanel}
    </>
  );
}
