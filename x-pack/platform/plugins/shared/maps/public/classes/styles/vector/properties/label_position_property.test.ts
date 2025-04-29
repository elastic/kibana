/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { SizeDynamicOptions } from '../../../../../common/descriptor_types';
import { LABEL_POSITIONS, VECTOR_STYLES } from '../../../../../common/constants';
import { IField } from '../../../fields/field';
import { IVectorLayer } from '../../../layers/vector_layer';
import { LabelPositionProperty } from './label_position_property';
import { StaticIconProperty } from './static_icon_property';
import { DynamicSizeProperty } from './dynamic_size_property';
import { StaticSizeProperty } from './static_size_property';

describe('syncLabelPositionWithMb', () => {
  let layoutProperties: Record<string, unknown> = {};
  const mockMbMap = {
    setLayoutProperty: (layerId: string, propName: string, propValue: unknown) => {
      layoutProperties[propName] = propValue;
    },
  } as unknown as MbMap;
  const mockStaticIconSize = {
    isDynamic: () => {
      return false;
    },
    getOptions: () => {
      return {
        size: 24,
      };
    },
  } as unknown as StaticSizeProperty;
  const dynamicIconSize = new DynamicSizeProperty(
    {
      maxSize: 32,
      minSize: 7,
    } as unknown as SizeDynamicOptions,
    VECTOR_STYLES.ICON_SIZE,
    {
      isValid: () => {
        return true;
      },
      getMbFieldName: () => {
        return 'iconSizeField';
      },
    } as unknown as IField,
    {} as unknown as IVectorLayer,
    () => {
      return null;
    },
    false
  );
  dynamicIconSize.getRangeFieldMeta = () => {
    return {
      min: 0,
      max: 100,
      delta: 100,
    };
  };
  const mockStaticLabelSize = {
    isDynamic: () => {
      return false;
    },
    getOptions: () => {
      return {
        size: 14,
      };
    },
  } as unknown as StaticSizeProperty;

  beforeEach(() => {
    layoutProperties = {};
  });

  describe('center', () => {
    test('should set center layout values when position is center', () => {
      const labelPosition = new LabelPositionProperty(
        {
          position: LABEL_POSITIONS.CENTER,
        },
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'center',
        'text-offset': [0, 0],
      });
    });
  });

  describe('top', () => {
    const options = {
      position: LABEL_POSITIONS.TOP,
    };

    test('should fallback to center layout values when disabled', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.isDisabled = () => {
        return true;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'center',
        'text-offset': [0, 0],
      });
    });

    test('should set layout values for static icon size', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'bottom',
        'text-offset': [0, -1.7142857142857142],
      });
    });

    test('should set layout values when symbolized as icon with center anchor', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {
          isDynamic: () => {
            return false;
          },
          getSymbolAnchor: () => {
            return 'center';
          },
        } as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        true
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'bottom',
        'text-offset': [0, -1.7142857142857142],
      });
    });

    test('should set layout values when symbolized as icon with bottom anchor', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {
          isDynamic: () => {
            return false;
          },
          getSymbolAnchor: () => {
            return 'bottom';
          },
        } as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        true
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'bottom',
        'text-offset': [0, -3],
      });
    });

    test('should set layout values for dynamic icon size', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        dynamicIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'bottom',
        'text-offset': [
          'interpolate',
          ['linear'],
          [
            'sqrt',
            [
              '+',
              [
                'coalesce',
                [
                  'case',
                  ['==', ['get', 'iconSizeField'], null],
                  0,
                  ['max', ['min', ['to-number', ['get', 'iconSizeField']], 100], 0],
                ],
                0,
              ],
              1,
            ],
          ],
          1,
          ['literal', [0, -0.5]],
          10.04987562112089,
          ['literal', [0, -2.2857142857142856]],
        ],
      });
    });
  });

  describe('bottom', () => {
    const options = {
      position: LABEL_POSITIONS.BOTTOM,
    };

    test('should set layout values for static icon size', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'top',
        'text-offset': [0, 1.7142857142857142],
      });
    });

    test('should set layout values when symbolized as icon with center anchor', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {
          isDynamic: () => {
            return false;
          },
          getSymbolAnchor: () => {
            return 'center';
          },
        } as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        true
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'top',
        'text-offset': [0, 1.7142857142857142],
      });
    });

    test('should set layout values when symbolized as icon with bottom anchor', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {
          isDynamic: () => {
            return false;
          },
          getSymbolAnchor: () => {
            return 'bottom';
          },
        } as unknown as StaticIconProperty,
        mockStaticIconSize,
        mockStaticLabelSize,
        true
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'top',
        'text-offset': [0, 0],
      });
    });

    test('should set layout values for dynamic icon size', () => {
      const labelPosition = new LabelPositionProperty(
        options,
        VECTOR_STYLES.LABEL_POSITION,
        {} as unknown as StaticIconProperty,
        dynamicIconSize,
        mockStaticLabelSize,
        false
      );
      labelPosition.isDisabled = () => {
        return false;
      };
      labelPosition.syncLabelPositionWithMb('layerId', mockMbMap);
      expect(layoutProperties).toEqual({
        'text-anchor': 'top',
        'text-offset': [
          'interpolate',
          ['linear'],
          [
            'sqrt',
            [
              '+',
              [
                'coalesce',
                [
                  'case',
                  ['==', ['get', 'iconSizeField'], null],
                  0,
                  ['max', ['min', ['to-number', ['get', 'iconSizeField']], 100], 0],
                ],
                0,
              ],
              1,
            ],
          ],
          1,
          ['literal', [0, 0.5]],
          10.04987562112089,
          ['literal', [0, 2.2857142857142856]],
        ],
      });
    });
  });
});
