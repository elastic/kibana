/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fieldCapsPgBenchMock = {
  indices: ['.ds-filebeat-8.2.0-2022.06.07-000082'],
  fields: {
    // The next two fields are not in the original field caps response,
    // but are added here to test the logic to ignore fields that are not
    // in the safe list. It's based on a real world example where the mapping
    // included a double mapping of text+integer.
    ignore_this_text_field: {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'ignore_this_text_field.int': {
      integer: { type: 'integer', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.uid': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    stack: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.namespace_uid': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.name.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
    },
    'kubernetes.labels': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'host.hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.mac': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.kubernetes_io/os': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'service.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'transaction.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    hostname: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.version': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.beta_kubernetes_io/os': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    _metadata: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.topology_kubernetes_io/region': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'fileset.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.account': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'span.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'agent.hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.x-real-ip': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.connection': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    labels: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'cloud.service': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    '_metadata.message_template': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    input: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'log.origin.function': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.containerized': {
      boolean: { type: 'boolean', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.beta_kubernetes_io/instance-type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.failure-domain_beta_kubernetes_io/region': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'elasticapm_labels.trace.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.ip': { ip: { type: 'ip', metadata_field: false, searchable: true, aggregatable: true } },
    'agent.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.executable.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
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
    'postgresql.log.database': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.container.name': {
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
    'cloud.account.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    elasticapm_transaction_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'error.message': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
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
    'process.name.text': {
      text: { type: 'text', metadata_field: false, searchable: true, aggregatable: false },
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
    'client.ip': {
      ip: { type: 'ip', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.file': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'process.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
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
    '_metadata.metadata_event_dataset': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log.timestamp': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.module': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    related: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
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
    client: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.pod.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.cache-control': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.timezone': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
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
    'kubernetes.node.labels.kubernetes_io/hostname': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.traceparent': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.namespace_labels': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    service: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.node_type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    container: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'event.category': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'elasticapm_labels.trace': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.topology_kubernetes_io/zone': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo.country_iso_code': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    type: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.method': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.image.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.labels.app': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'agent.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.original': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.thread.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.io_kubernetes_pod_uid': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.failure-domain_beta_kubernetes_io/zone': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'input.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.flags': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'related.user': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.architecture': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    elasticapm_labels: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'req.url': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.provider': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.machine.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'agent.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.machine': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.labels.io_kubernetes_sandbox_id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.pragma': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.io_kubernetes_docker_type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    '_metadata.elastic_apm_transaction_id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.labels.cloud_google_com/gke-os-distribution': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    log: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.pod': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.labels.annotation_io_kubernetes_container_hash': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.remoteAddress': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'user.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.logger': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log.query_step': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.instance.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo.region_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    stream: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'log.origin.file': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels.cloud_google_com/gke-nodepool': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    event: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'req.headers.host': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.content-type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.replicaset.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'host.os.codename': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.referer': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.cookie': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'elasticapm_labels.span': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'log.origin.file.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    data_stream: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'data_stream.dataset': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'agent.ephemeral_id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.project': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.image': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    transaction: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'cloud.project.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    span: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.labels.annotation_io_kubernetes_container_terminationMessagePolicy': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'elasticapm_labels.transaction': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'cloud.availability_zone': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    cloud: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'container.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    ecs: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.namespace': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    host: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'host.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.accept': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo.country_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.kind': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.replicaset': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'elasticapm_labels.transaction.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'data_stream.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.runtime': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'cloud.service.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'ecs.version': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.io_kubernetes_pod_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'labels.userId': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.annotation_io_kubernetes_container_terminationMessagePath': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.node.name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo.continent_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'postgresql.log': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'req.headers.user-agent': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.pod.uid': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    error: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'kubernetes.node.labels': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    trace: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'trace.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    postgresql: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'elasticapm_labels.span.id': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'kubernetes.container': {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    elasticapm_trace_id: {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'process.executable': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    process: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'client.geo.city_name': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'client.geo.region_iso_code': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'data_stream.namespace': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'req.headers.content-length': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'event.type': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    user: {
      object: { type: 'object', metadata_field: false, searchable: false, aggregatable: false },
    },
    'event.dataset': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
    'container.labels.io_kubernetes_container_logpath': {
      keyword: { type: 'keyword', metadata_field: false, searchable: true, aggregatable: true },
    },
  },
};
