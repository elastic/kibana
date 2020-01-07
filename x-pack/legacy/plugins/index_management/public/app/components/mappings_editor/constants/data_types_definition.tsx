/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiCode } from '@elastic/eui';

import { documentationService } from '../../../services/documentation';
import { MainType, SubType, DataType, DataTypeDefinition } from '../types';

export const TYPE_DEFINITION: { [key in DataType]: DataTypeDefinition } = {
  text: {
    value: 'text',
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.textDescription', {
      defaultMessage: 'Text',
    }),
    documentation: {
      main: '/text.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.textLongDescription"
          defaultMessage="Text fields support full-text search by breaking strings into individual, searchable terms. To index structured content, such as an email address, use the {keyword}."
          values={{
            keyword: (
              <EuiLink href={documentationService.getTypeDocLink('keyword')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.textLongDescription.keywordTypeLink',
                  {
                    defaultMessage: 'keyword data type',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.dateLongDescription"
          defaultMessage='Date fields accept strings containing formatted dates (e.g. "2015-01-01" or "2015/01/01 12:10:30"), long numbers representing milliseconds-since-the-epoch, and integers representing seconds-since-the-epoch. You can specify multiple date formats. Dates with timezone information will be converted to UTC internally.'
        />
      </p>
    ),
  },
  date_nanos: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.dateNanosDescription', {
      defaultMessage: 'Date nanoseconds',
    }),
    value: 'date_nanos',
    documentation: {
      main: '/date_nanos.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.dateNanosLongDescription"
          defaultMessage="Date nanoseconds fields store dates in nanosecond resolution. Aggregations are still on the millisecond resolution. If you need to store dates in millisecond resolution, use the {date}."
          values={{
            date: (
              <EuiLink href={documentationService.getTypeDocLink('date')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.dateNanosLongDescription.dateTypeLink',
                  {
                    defaultMessage: 'date data type',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  binary: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.binaryDescription', {
      defaultMessage: 'Binary',
    }),
    value: 'binary',
    documentation: {
      main: '/binary.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.binaryLongDescription"
          defaultMessage="Binary fields accept a binary value as a Base64-encoded string. By default, binary fields are not stored or searchable."
        />
      </p>
    ),
  },
  ip: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.ipDescription', {
      defaultMessage: 'IP',
    }),
    value: 'ip',
    documentation: {
      main: '/ip.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.ipLongDescription"
          defaultMessage="IP fields accept IPv4 or IPv6 addresses. If you need to store IP ranges in a single field, use the {ipRange}."
          values={{
            ipRange: (
              <EuiLink href={documentationService.getTypeDocLink('range')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.ipLongDescription.ipRangeTypeLink',
                  {
                    defaultMessage: 'IP range data type',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  boolean: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.booleanDescription', {
      defaultMessage: 'Boolean',
    }),
    value: 'boolean',
    documentation: {
      main: '/boolean.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.booleanLongDescription"
          defaultMessage="Boolean fields accept JSON {true} and {false} values, as well as strings which are interpreted as true or false."
          values={{
            true: <EuiCode>true</EuiCode>,
            false: <EuiCode>false</EuiCode>,
          }}
        />
      </p>
    ),
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
      types: [
        'date_range',
        'double_range',
        'float_range',
        'integer_range',
        'ip_range',
        'long_range',
      ],
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
  ip_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.ipRangeDescription', {
      defaultMessage: 'IP range',
    }),
    value: 'ip_range',
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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.geoShapeType.fieldDescription"
          defaultMessage="Geo-shapes are indexed by decomposing the shape into a triangular mesh and indexing each triangle as a 7-dimensional point in a BKD tree. {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                href={documentationService.getTypeDocLink('geo_shape', 'learnMore')}
                target="_blank"
              >
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.geoShapeType.fieldDescription.learnMoreLink',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
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
      main: '/parent-join.html',
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

/**
 * Return a map of subType -> mainType
 *
 * @example
 *
 * {
 *   long: 'numeric',
 *   integer: 'numeric',
 *   short: 'numeric',
 * }
 */
export const SUB_TYPE_MAP_TO_MAIN = Object.entries(MAIN_DATA_TYPE_DEFINITION).reduce(
  (acc, [type, definition]) => {
    if ({}.hasOwnProperty.call(definition, 'subTypes')) {
      definition.subTypes!.types.forEach(subType => {
        acc[subType] = type;
      });
    }
    return acc;
  },
  {} as Record<SubType, string>
);

// Single source of truth of all the possible data types.
export const ALL_DATA_TYPES = [
  ...Object.keys(MAIN_DATA_TYPE_DEFINITION),
  ...Object.keys(SUB_TYPE_MAP_TO_MAIN),
];
