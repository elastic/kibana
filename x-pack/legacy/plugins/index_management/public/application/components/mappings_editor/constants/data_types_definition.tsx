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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.keywordLongDescription"
          defaultMessage="Keyword fields support searching for an exact value and are useful for filtering, sorting, and aggregations. To index full-text content, such as an email body, use the {textType}."
          values={{
            textType: (
              <EuiLink href={documentationService.getTypeDocLink('text')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.keywordLongDescription.textTypeLink',
                  {
                    defaultMessage: 'text data type',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.byteLongDescription"
          defaultMessage="Byte fields accept a signed 8-bit integer with a minimum value of {minValue} and a maximum value of {maxValue}."
          values={{
            minValue: <EuiCode>-128</EuiCode>,
            maxValue: <EuiCode>127</EuiCode>,
          }}
        />
      </p>
    ),
  },
  double: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.doubleDescription', {
      defaultMessage: 'Double',
    }),
    value: 'double',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.doubleLongDescription"
          defaultMessage="Double fields accept a double-precision 64-bit floating point number, restricted to finite values (IEEE 754)."
        />
      </p>
    ),
  },
  integer: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.integerDescription', {
      defaultMessage: 'Integer',
    }),
    value: 'integer',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.integerLongDescription"
          defaultMessage="Integer fields accept a signed 32-bit integer with a minimum value of {minValue} and a maximum value of {maxValue}."
          values={{
            minValue: (
              <EuiCode>
                -2<sup className="eui-alignTop">31</sup>
              </EuiCode>
            ),
            maxValue: (
              <EuiCode>
                2<sup className="eui-alignTop">31</sup>-1
              </EuiCode>
            ),
          }}
        />
      </p>
    ),
  },
  long: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.longDescription', {
      defaultMessage: 'Long',
    }),
    value: 'long',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.longLongDescription"
          defaultMessage="Long fields accept a signed 64-bit integer with a minimum value of {minValue} and a maximum value of {maxValue}."
          values={{
            minValue: (
              <EuiCode>
                -2<sup className="eui-alignTop">63</sup>
              </EuiCode>
            ),
            maxValue: (
              <EuiCode>
                2<sup className="eui-alignTop">63</sup>-1
              </EuiCode>
            ),
          }}
        />
      </p>
    ),
  },
  float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.floatDescription', {
      defaultMessage: 'Float',
    }),
    value: 'float',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.floatLongDescription"
          defaultMessage="Float fields accept a single-precision 32-bit floating point number, restricted to finite values (IEEE 754)."
        />
      </p>
    ),
  },
  half_float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.halfFloatDescription', {
      defaultMessage: 'Half float',
    }),
    value: 'half_float',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.halfFloatLongDescription"
          defaultMessage="Half-float fields accept a half-precision 16-bit floating point number, restricted to finite values (IEEE 754)."
        />
      </p>
    ),
  },
  scaled_float: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.scaledFloatDescription', {
      defaultMessage: 'Scaled float',
    }),
    value: 'scaled_float',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.scaledFloatLongDescription"
          defaultMessage="Scaled-float fields accept a floating point number that is backed by a {longType} and scaled by a fixed {doubleType} scaling factor. Use this data type to store floating point data into an integer using a scaling factor. This saves disk space, but affects accuracy."
          values={{
            longType: <EuiCode>long</EuiCode>,
            doubleType: <EuiCode>double</EuiCode>,
          }}
        />
      </p>
    ),
  },
  short: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.shortDescription', {
      defaultMessage: 'Short',
    }),
    value: 'short',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.shortLongDescription"
          defaultMessage="Short fields accept a signed 16-bit integer with a minimum value of {minValue} and a maximum value of {maxValue}."
          values={{
            minValue: <EuiCode>-32,768</EuiCode>,
            maxValue: <EuiCode>32,767</EuiCode>,
          }}
        />
      </p>
    ),
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
          defaultMessage='Date fields accept strings with formatted dates ("2015/01/01 12:10:30"), long numbers representing milliseconds since the epoch, and integers representing seconds since the epoch. Multiple date formats are allowed. Dates with timezones are converted to UTC.'
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
          defaultMessage="Date nanoseconds fields store dates in nanosecond resolution. Aggregations remain in millisecond resolution. To store dates in millisecond resolution, use the {date}."
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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.objectLongDescription"
          defaultMessage="Object fields can contain children, which are queried as a flattened list. To query child objects independently, use the {nested}."
          values={{
            nested: (
              <EuiLink href={documentationService.getTypeDocLink('nested')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.objectLongDescription.nestedTypeLink',
                  {
                    defaultMessage: 'nested data type',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  nested: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.nestedDescription', {
      defaultMessage: 'Nested',
    }),
    value: 'nested',
    documentation: {
      main: '/nested.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.nestedLongDescription"
          defaultMessage="Like {objects}, nested fields can contain children. The difference is that you can query their child objects independently."
          values={{
            objects: (
              <EuiLink href={documentationService.getTypeDocLink('object')} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.nestedLongDescription.objectTypeLink',
                  {
                    defaultMessage: 'objects',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  rank_feature: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rankFeatureDescription', {
      defaultMessage: 'Rank feature',
    }),
    value: 'rank_feature',
    documentation: {
      main: '/rank-feature.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.rankFeatureLongDescription"
          defaultMessage="The rank feature field accepts a number that will boost documents in {rankFeatureQuery}."
          values={{
            rankFeatureQuery: (
              <EuiLink href={documentationService.getRankFeatureQueryLink()} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.rankFeatureLongDescription.queryLink',
                  {
                    defaultMessage: 'rank_feature queries',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  rank_features: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.rankFeaturesDescription', {
      defaultMessage: 'Rank features',
    }),
    value: 'rank_features',
    documentation: {
      main: '/rank-features.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.rankFeaturesLongDescription"
          defaultMessage="The rank features field accepts numeric vectors that will boost documents in {rankFeatureQuery}."
          values={{
            rankFeatureQuery: (
              <EuiLink href={documentationService.getRankFeatureQueryLink()} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.rankFeaturesLongDescription.queryLink',
                  {
                    defaultMessage: 'rank_feature queries',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  dense_vector: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.denseVectorDescription', {
      defaultMessage: 'Dense vector',
    }),
    value: 'dense_vector',
    documentation: {
      main: '/dense-vector.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.denseVectorLongDescription"
          defaultMessage="Dense vector fields store vectors of float values, useful for document scoring."
        />
      </p>
    ),
  },
  date_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.dateRangeDescription', {
      defaultMessage: 'Date range',
    }),
    value: 'date_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.dateRangeLongDescription"
          defaultMessage="Date range fields accept an unsigned 64-bit integer representing milliseconds since the system epoch."
        />
      </p>
    ),
  },
  double_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.doubleRangeDescription', {
      defaultMessage: 'Double range',
    }),
    value: 'double_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.doubleRangeLongDescription"
          defaultMessage="Double range fields accept a 64-bit double precision floating point number (IEEE 754 binary64)."
        />
      </p>
    ),
  },
  float_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.floatRangeDescription', {
      defaultMessage: 'Float range',
    }),
    value: 'float_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.floatRangeLongDescription"
          defaultMessage="Float range fields accept a 32-bit single precision floating point number (IEEE 754 binary32)."
        />
      </p>
    ),
  },
  integer_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.integerRangeDescription', {
      defaultMessage: 'Integer range',
    }),
    value: 'integer_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.integerRangeLongDescription"
          defaultMessage="Integer range fields accept a signed 32-bit integer."
        />
      </p>
    ),
  },
  long_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.longRangeDescription', {
      defaultMessage: 'Long range',
    }),
    value: 'long_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.longRangeLongDescription"
          defaultMessage="Long range fields accept a signed 64-bit integer."
        />
      </p>
    ),
  },
  ip_range: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.ipRangeDescription', {
      defaultMessage: 'IP range',
    }),
    value: 'ip_range',
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.ipRangeLongDescription"
          defaultMessage="IP range fields accept an IPv4 or IPV6 address."
        />
      </p>
    ),
  },
  geo_point: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.geoPointDescription', {
      defaultMessage: 'Geo-point',
    }),
    value: 'geo_point',
    documentation: {
      main: '/geo-point.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.geoPointLongDescription"
          defaultMessage="Geo-point fields accept latitude and longitude pairs. Use this data type to search within a bounding box, aggregate documents geographically, and sort documents by distance."
        />
      </p>
    ),
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
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.completionSuggesterLongDescription"
          defaultMessage="Completion suggester fields support autocomplete, but require special data structures that occupy memory and build slowly."
        />
      </p>
    ),
  },
  token_count: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.tokenCountDescription', {
      defaultMessage: 'Token count',
    }),
    value: 'token_count',
    documentation: {
      main: '/token-count.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.tokenCountLongDescription"
          defaultMessage="Token count fields accept string values.  These values are analyzed, and the number of tokens in the string are indexed."
        />
      </p>
    ),
  },
  percolator: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.percolatorDescription', {
      defaultMessage: 'Percolator',
    }),
    value: 'percolator',
    documentation: {
      main: '/percolator.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.percolatorLongDescription"
          defaultMessage="The percolator data type enables {percolator}."
          values={{
            percolator: (
              <EuiLink href={documentationService.getPercolatorQueryLink()} target="_blank">
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.dataType.percolatorLongDescription.learnMoreLink',
                  {
                    defaultMessage: 'percolator queries',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </p>
    ),
  },
  join: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.joinDescription', {
      defaultMessage: 'Join',
    }),
    value: 'join',
    documentation: {
      main: '/parent-join.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.joinLongDescription"
          defaultMessage="Join fields define parent-child relationships among documents of the same index."
        />
      </p>
    ),
  },
  alias: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.aliasDescription', {
      defaultMessage: 'Alias',
    }),
    value: 'alias',
    documentation: {
      main: '/alias.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.aliasLongDescription"
          defaultMessage="Alias fields accept an alternative name for a field, which you can use in search requests."
        />
      </p>
    ),
  },
  search_as_you_type: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.searchAsYouTypeDescription', {
      defaultMessage: 'Search-as-you-type',
    }),
    value: 'search_as_you_type',
    documentation: {
      main: '/search-as-you-type.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.searchAsYouTypeLongDescription"
          defaultMessage="Search-as-you-type fields break strings into subfields for search suggestions, and will match terms at any position in the string."
        />
      </p>
    ),
  },
  flattened: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.flattenedDescription', {
      defaultMessage: 'Flattened',
    }),
    value: 'flattened',
    documentation: {
      main: '/flattened.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.flattenedLongDescription"
          defaultMessage="Flattened fields map an object as a single field and are useful for indexing objects with a large or unknown number of unique keys. Flattened fields support basic queries only."
        />
      </p>
    ),
  },
  shape: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.dataType.shapeDescription', {
      defaultMessage: 'Shape',
    }),
    value: 'shape',
    documentation: {
      main: '/shape.html',
    },
    description: () => (
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dataType.shapeLongDescription"
          defaultMessage="Shape fields enable searching of complex shapes, such as rectangles and polygons."
        />
      </p>
    ),
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
