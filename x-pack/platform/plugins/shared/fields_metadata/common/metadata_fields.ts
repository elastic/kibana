/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MetadataFields = {
  _index: {
    dashed_name: 'index',
    description:
      'The index to which the document belongs. This metadata field specifies the exact index name in which the document is stored.',
    example: 'index_1',
    flat_name: '_index',
    name: '_index',
    short: 'The index to which the document belongs.',
    type: 'keyword',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-index-field.html',
  },
  _id: {
    dashed_name: 'id',
    description:
      'The document’s ID. This unique identifier is used to fetch, update, or delete a document within an index.',
    example: '1',
    flat_name: '_id',
    name: '_id',
    short: 'The document’s ID.',
    type: 'keyword',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-id-field.html',
  },
  _source: {
    dashed_name: 'source',
    description:
      'The original JSON representing the body of the document. This field contains all the source data that was provided at the time of indexing.',
    example: '{"user": "John Doe", "message": "Hello"}',
    flat_name: '_source',
    name: '_source',
    short: 'The original JSON representing the body of the document.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-source-field.html',
  },
  _size: {
    dashed_name: 'size',
    description:
      'The size of the _source field in bytes. Provided by the mapper-size plugin, this metadata field helps in understanding the storage impact of the document.',
    example: '150',
    flat_name: '_size',
    name: '_size',
    short: 'The size of the _source field in bytes, provided by the mapper-size plugin.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/plugins/current/mapper-size.html',
  },
  _doc_count: {
    dashed_name: 'doc_count',
    description:
      'A custom field used for storing document counts when a document represents pre-aggregated data. It helps in scenarios involving pre-computed data aggregation.',
    example: '42',
    flat_name: '_doc_count',
    name: '_doc_count',
    short:
      'A custom field used for storing doc counts when a document represents pre-aggregated data.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-doc-count-field.html',
  },
  _field_names: {
    dashed_name: 'field_names',
    description:
      'All fields in the document which contain non-null values. This metadata field lists the field names that have valid data.',
    example: '["user", "message"]',
    flat_name: '_field_names',
    name: '_field_names',
    short: 'Fields with non-null values.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-field-names-field.html',
  },
  _ignored: {
    dashed_name: 'ignored',
    description:
      'All fields in the document that have been ignored at index time because of ignore_malformed. It indicates fields that were not indexed due to malformation.',
    example: '["malformed_field"]',
    flat_name: '_ignored',
    name: '_ignored',
    short: 'Fields ignored during indexing.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-ignored-field.html',
  },
  _routing: {
    dashed_name: 'routing',
    description:
      'A custom routing value which routes a document to a particular shard. This field is used to control the shard placement of a document.',
    example: 'user_routing_value',
    flat_name: '_routing',
    name: '_routing',
    short: 'Custom shard routing value.',
    type: 'keyword',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-routing-field.html',
  },
  _meta: {
    dashed_name: 'meta',
    description:
      'Application specific metadata. This field can store any custom metadata relevant to the application using Elasticsearch.',
    example: '{"app": "my_app"}',
    flat_name: '_meta',
    name: '_meta',
    short: 'Custom application metadata.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-meta-field.html',
  },
  _tier: {
    dashed_name: 'tier',
    description:
      'The current data tier preference of the index to which the document belongs. It helps in managing the index’s storage tier.',
    example: 'hot',
    flat_name: '_tier',
    name: '_tier',
    short: 'Index data tier preference.',
    documentation_url:
      'https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-tier-field.html',
  },
};
