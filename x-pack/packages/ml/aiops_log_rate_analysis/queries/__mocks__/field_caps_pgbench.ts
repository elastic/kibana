/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsPgBenchMock = {
  indices: ['my-index'],
  fields: {
    stack: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    metadata: {
      flattened: { type: 'flattened', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.namespace_uid': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.kubernetes_io/os': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    hostname: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _metadata: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    _version: {
      _version: { type: '_version', metadata_field: true, searchable: false, aggregatable: true },
    },
    'req.headers.x-real-ip': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    amount_f: {
      float: { type: 'float', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.addon_gke_io/node-local-dns-ds-ready': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.pod.ip': {
      ip: { type: 'ip', metadata_field: false, searchable: true, aggregatable: true },
    },
    '_metadata.user_id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.container.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log.database': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.annotation_io_kubernetes_container_restartCount': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    fileset: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.beta_kubernetes_io/arch': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.platform': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _field_names: {
      _field_names: {
        type: '_field_names',
        metadata_field: true,
        searchable: true,
        aggregatable: false,
      },
    },
    'cloud.account.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    v: { long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true } },
    'error.message': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    elasticapm_transaction_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.file.path': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.kubernetes_io/arch': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.io_kubernetes_container_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'user.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'user.name.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'cloud.instance.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.accept-encoding': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    kubernetes: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    agent: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'cloud.instance': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.labels.io_kubernetes_pod_namespace': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.labels.pod-template-hash': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.origin': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.cloud_google_com/machine-family': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    elasticapm_span_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'host.os.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.name.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'log.level': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    details: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log.query': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.thread': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.labels.annotation_io_kubernetes_pod_terminationGracePeriod': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    req: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.cloud_google_com/gke-boot-disk': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    '_metadata.elastic_apm_trace_id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.file': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'log.offset': {
      long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.ip': {
      ip: { type: 'ip', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.name.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    name: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'agent.version': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.family': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.origin': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.node_kubernetes_io/instance-type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.tracestate': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log.timestamp': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    '_metadata.metadata_event_dataset': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    related: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'event.module': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'host.os.kernel': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.cloud_google_com/gke-container-runtime': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.pod.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    client: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'req.headers.cache-control': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.timezone': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.origin.file.line': {
      long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true },
    },
    'service.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.namespace_labels.kubernetes_io/metadata_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    message: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    _source: {
      _source: { type: '_source', metadata_field: true, searchable: false, aggregatable: false },
    },
    log: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    event: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'event.duration': {
      long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.ingested': {
      date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true },
    },
    '@timestamp': {
      date: { type: 'date', metadata_field: false, searchable: true, aggregatable: true },
    },
    transaction: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    span: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    '_metadata.sum': {
      long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true },
    },
    _tier: {
      keyword: { type: 'keyword', metadata_field: true, searchable: true, aggregatable: true },
    },
    _seq_no: {
      _seq_no: { type: '_seq_no', metadata_field: true, searchable: true, aggregatable: true },
    },
    code: { long: { type: 'long', metadata_field: false, searchable: true, aggregatable: true } },
    _index: {
      _index: { type: '_index', metadata_field: true, searchable: true, aggregatable: true },
    },
    'client.geo.location': {
      geo_point: { type: 'geo_point', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};
