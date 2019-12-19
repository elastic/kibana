/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { MainType, DataType, DataTypeDefinition } from '../types';

export const TYPE_DEFINITION: { [key in DataType]: DataTypeDefinition } = {
  text: {
    value: 'text',
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.textDescription', {
      defaultMessage: 'Text',
    }),
    documentation: {
      main: '/text.html',
    },
  },
  keyword: {
    value: 'keyword',
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.keywordDescription', {
      defaultMessage: 'Keyword',
    }),
    documentation: {
      main: '/keyword.html',
    },
  },
  numeric: {
    value: 'numeric',
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.numericDescription', {
      defaultMessage: 'Numeric',
    }),
    documentation: {
      main: '/number.html',
    },
    subTypes: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.numericSubtypeDescription', {
        defaultMessage: 'Numeric type',
      }),
      types: ['byte', 'double', 'float', 'half_float', 'integer', 'long', 'scaled_float', 'short'],
    },
  },
  byte: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.byteDescription', {
      defaultMessage: 'Byte',
    }),
    value: 'byte',
  },
  double: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.doubleDescription', {
      defaultMessage: 'Double',
    }),
    value: 'double',
  },
  integer: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.integerDescription', {
      defaultMessage: 'Integer',
    }),
    value: 'integer',
  },
  long: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.longDescription', {
      defaultMessage: 'Long',
    }),
    value: 'long',
  },
  float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.floatDescription', {
      defaultMessage: 'Float',
    }),
    value: 'float',
  },
  half_float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.halfFloatDescription', {
      defaultMessage: 'Half float',
    }),
    value: 'half_float',
  },
  scaled_float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.scaledFloatDescription', {
      defaultMessage: 'Scaled float',
    }),
    value: 'scaled_float',
  },
  short: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.shortDescription', {
      defaultMessage: 'Short',
    }),
    value: 'short',
  },
  date: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.dateDescription', {
      defaultMessage: 'Date',
    }),
    value: 'date',
    documentation: {
      main: '/date.html',
    },
  },
  date_nanos: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.dateNanosDescription', {
      defaultMessage: 'Date nanos',
    }),
    value: 'date_nanos',
    documentation: {
      main: '/date_nanos.html',
    },
  },
  binary: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.binaryDescription', {
      defaultMessage: 'Binary',
    }),
    value: 'binary',
    documentation: {
      main: '/binary.html',
    },
  },
  ip: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.ipDescription', {
      defaultMessage: 'IP',
    }),
    value: 'ip',
    documentation: {
      main: '/ip.html',
    },
  },
  boolean: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.booleanDescription', {
      defaultMessage: 'Boolean',
    }),
    value: 'boolean',
    documentation: {
      main: '/boolean.html',
    },
  },
  range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rangeDescription', {
      defaultMessage: 'Range',
    }),
    value: 'range',
    documentation: {
      main: '/range.html',
    },
    subTypes: {
      label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rangeSubtypeDescription', {
        defaultMessage: 'Range type',
      }),
      types: ['date_range', 'double_range', 'float_range', 'integer_range', 'long_range'],
    },
  },
  object: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.objectDescription', {
      defaultMessage: 'Object',
    }),
    value: 'object',
    documentation: {
      main: '/object.html',
    },
  },
  nested: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.nestedDescription', {
      defaultMessage: 'Nested',
    }),
    value: 'nested',
    documentation: {
      main: '/nested.html',
    },
  },
  rank_feature: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rankFeatureDescription', {
      defaultMessage: 'Rank feature',
    }),
    value: 'rank_feature',
    documentation: {
      main: '/rank-feature.html',
    },
  },
  rank_features: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rankFeaturesDescription', {
      defaultMessage: 'Rank features',
    }),
    value: 'rank_features',
    documentation: {
      main: '/rank-features.html',
    },
  },
  dense_vector: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.denseVectorDescription', {
      defaultMessage: 'Dense vector',
    }),
    value: 'dense_vector',
    documentation: {
      main: '/dense-vector.html',
    },
  },
  date_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.dateRangeDescription', {
      defaultMessage: 'Date range',
    }),
    value: 'date_range',
  },
  double_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.doubleRangeDescription', {
      defaultMessage: 'Double range',
    }),
    value: 'double_range',
  },
  float_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.floatRangeDescription', {
      defaultMessage: 'Float range',
    }),
    value: 'float_range',
  },
  integer_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.integerRangeDescription', {
      defaultMessage: 'Integer range',
    }),
    value: 'integer_range',
  },
  long_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.longRangeDescription', {
      defaultMessage: 'Long range',
    }),
    value: 'long_range',
  },
  geo_point: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.geoPointDescription', {
      defaultMessage: 'Geo-point',
    }),
    value: 'geo_point',
    documentation: {
      main: '/geo-point.html',
    },
  },
  geo_shape: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.geoShapeDescription', {
      defaultMessage: 'Geo-shape',
    }),
    value: 'geo_shape',
    documentation: {
      main: '/geo-shape.html',
      learnMore: '/geo-shape.html#geoshape-indexing-approach',
    },
  },
  completion: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.completionSuggesterDescription', {
      defaultMessage: 'Completion suggester',
    }),
    value: 'completion',
    documentation: {
      main: '/search-suggesters.html#completion-suggester',
    },
  },
  token_count: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.tokenCountDescription', {
      defaultMessage: 'Token count',
    }),
    value: 'token_count',
    documentation: {
      main: '/token-count.html',
    },
  },
  percolator: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.percolatorDescription', {
      defaultMessage: 'Percolator',
    }),
    value: 'percolator',
    documentation: {
      main: '/percolator.html',
    },
  },
  join: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.joinDescription', {
      defaultMessage: 'Join',
    }),
    value: 'join',
    documentation: {
      main: '/join.html',
    },
  },
  alias: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.aliasDescription', {
      defaultMessage: 'Alias',
    }),
    value: 'alias',
    documentation: {
      main: '/alias.html',
    },
  },
  search_as_you_type: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.searchAsYouTypeDescription', {
      defaultMessage: 'Search-as-you-type',
    }),
    value: 'search_as_you_type',
    documentation: {
      main: '/search-as-you-type.html',
    },
  },
  flattened: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.flattenedDescription', {
      defaultMessage: 'Flattened',
    }),
    value: 'flattened',
    documentation: {
      main: '/flattened.html',
    },
  },
  shape: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.shapeDescription', {
      defaultMessage: 'Shape',
    }),
    value: 'shape',
    documentation: {
      main: '/shape.html',
    },
  },
};

export const MAIN_TYPES: MainType[] = [
  'alias',
  'binary',
  'boolean',
  'completion',
  'date',
  'date_nanos',
  'dense_vector',
  'flattened',
  'geo_point',
  'geo_shape',
  'ip',
  'join',
  'keyword',
  'nested',
  'numeric',
  'object',
  'percolator',
  'range',
  'rank_feature',
  'rank_features',
  'search_as_you_type',
  'shape',
  'text',
  'token_count',
];

export const MAIN_DATA_TYPE_DEFINITION: {
  [key in MainType]: DataTypeDefinition;
} = MAIN_TYPES.reduce(
  (acc, type) => ({
    ...acc,
    [type]: TYPE_DEFINITION[type],
  }),
  {} as { [key in MainType]: DataTypeDefinition }
);
