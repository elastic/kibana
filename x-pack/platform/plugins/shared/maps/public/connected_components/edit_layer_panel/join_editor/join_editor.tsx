/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { EuiSkeletonText, EuiTextAlign, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Join } from './resources/join';
import { JoinDocumentationPopover } from './resources/join_documentation_popover';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { isESSource } from '../../../classes/sources/es_source';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { AddJoinButton } from './add_join_button';

export interface JoinField {
  label: string;
  name: string;
}

export interface Props {
  joins: Array<Partial<JoinDescriptor>>;
  layer: IVectorLayer;
  layerDisplayName: string;
  leftJoinFields: JoinField[];
  onChange: (layer: IVectorLayer, joins: Array<Partial<JoinDescriptor>>) => void;
}

export function JoinEditor({ joins, layer, onChange, leftJoinFields, layerDisplayName }: Props) {
  const [supportsSpatialJoin, setSupportsSpatialJoin] = useState(false);
  const [spatialJoinDisableReason, setSpatialJoinDisableReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    const source = layer.getSource();
    if (!isESSource(source)) {
      setSpatialJoinDisableReason(
        i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.disabled.esSourceOnly', {
          defaultMessage: 'Spatial joins are not supported for {sourceType}.',
          values: { sourceType: source.getType() },
        })
      );
      setSupportsSpatialJoin(false);
      return;
    }

    if (source.isMvt()) {
      setSpatialJoinDisableReason(
        i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.disabled.geoJsonOnly', {
          defaultMessage: 'Spatial joins are not supported with vector tiles.',
        })
      );
      setSupportsSpatialJoin(false);
      return;
    }

    // TODO remove isPointsOnly check once non-point spatial joins have been implemented
    setIsLoading(true);
    source
      .getSupportedShapeTypes()
      .then((supportedShapes) => {
        if (!ignore) {
          const isPointsOnly =
            supportedShapes.length === 1 && supportedShapes[0] === VECTOR_SHAPE_TYPE.POINT;
          if (!isPointsOnly) {
            setSpatialJoinDisableReason(
              i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.disabled.pointsOnly', {
                defaultMessage: 'Spatial joins are not supported with geo_shape geometry.',
              })
            );
            setSupportsSpatialJoin(isPointsOnly);
            setIsLoading(false);
            return;
          }

          setSpatialJoinDisableReason('');
          setSupportsSpatialJoin(true);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        // keep spatial joins disabled when unable to verify if they are supported
      });

    return () => {
      ignore = true;
    };
  }, [layer]);

  const renderJoins = () => {
    return joins.map((joinDescriptor: Partial<JoinDescriptor>, index: number) => {
      const handleOnChange = (updatedDescriptor: Partial<JoinDescriptor>) => {
        onChange(layer, [...joins.slice(0, index), updatedDescriptor, ...joins.slice(index + 1)]);
      };

      const handleOnRemove = () => {
        onChange(layer, [...joins.slice(0, index), ...joins.slice(index + 1)]);
      };

      return (
        <Join
          key={joinDescriptor?.right?.id ?? index}
          join={joinDescriptor}
          onChange={handleOnChange}
          onRemove={handleOnRemove}
          leftFields={leftJoinFields}
          leftSourceName={layerDisplayName}
        />
      );
    });
  };

  const addJoin = (joinDescriptor: Partial<JoinDescriptor>) => {
    onChange(layer, [
      ...joins,
      {
        ...joinDescriptor,
        right: {
          ...(joinDescriptor?.right ?? {}),
        },
      },
    ]);
  };

  return (
    <div>
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage id="xpack.maps.layerPanel.joinEditor.title" defaultMessage="Joins" />{' '}
          <JoinDocumentationPopover />
        </h5>
      </EuiTitle>

      {renderJoins()}

      <EuiSkeletonText lines={1} isLoading={isLoading}>
        <EuiTextAlign textAlign="center">
          <AddJoinButton
            disabledReason={spatialJoinDisableReason}
            isDisabled={!supportsSpatialJoin}
            label={i18n.translate('xpack.maps.layerPanel.joinEditor.spatialJoin.addButtonLabel', {
              defaultMessage: 'Add spatial join',
            })}
            onClick={() => {
              addJoin({
                leftField: '_id',
                right: {
                  type: SOURCE_TYPES.ES_DISTANCE_SOURCE,
                  id: uuidv4(),
                  applyGlobalQuery: true,
                  applyGlobalTime: true,
                },
              } as Partial<JoinDescriptor>);
            }}
          />
          <AddJoinButton
            disabledReason={i18n.translate(
              'xpack.maps.layerPanel.joinEditor.termJoin.mvtSingleJoinMsg',
              {
                defaultMessage: 'Vector tiles can only support a single join.',
              }
            )}
            isDisabled={layer.getSource().isMvt() && joins.length >= 1}
            label={i18n.translate('xpack.maps.layerPanel.joinEditor.termJoin.addButtonLabel', {
              defaultMessage: 'Add term join',
            })}
            onClick={() => {
              addJoin({
                right: {
                  type: SOURCE_TYPES.ES_TERM_SOURCE,
                  id: uuidv4(),
                  applyGlobalQuery: true,
                  applyGlobalTime: true,
                },
              } as Partial<JoinDescriptor>);
            }}
          />
        </EuiTextAlign>
      </EuiSkeletonText>
    </div>
  );
}
