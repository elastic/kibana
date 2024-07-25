/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { paramsSearchQueryMock } from './__mocks__/params_search_query';
import { fieldCapsPgBenchMock } from './__mocks__/field_caps_pgbench';
import { fieldCapsEcommerceMock } from './__mocks__/field_caps_ecommerce';
import { fieldCapsLargeArraysMock } from './__mocks__/field_caps_large_arrays';

import { fetchFieldCandidates } from './fetch_field_candidates';

describe('fetchFieldCandidates', () => {
  it('returns field candidates for "my" fields', async () => {
    const esClientFieldCapsMock = jest.fn(() => ({
      fields: {
        // Should end up as a field candidate
        myIpFieldName: { ip: { aggregatable: true } },
        // Should end up as a field candidate
        myKeywordFieldName: { keyword: { aggregatable: true } },
        // Should not end up as a field candidate, it's a keyword but non-aggregatable
        myKeywordFieldNameToBeIgnored: { keyword: { aggregatable: false } },
        // Should not end up as a field candidate since fields of type number will not be considered
        myNumericFieldName: { number: {} },
        // Should end up as a text field candidate
        message: { text: { aggregatable: false } },
        // Should note end up as a text field candidate
        myTextField: { text: { aggregatable: false } },
      },
    }));

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
    } as unknown as ElasticsearchClient;

    const {
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = await fetchFieldCandidates({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
    expect(textFieldCandidates).toEqual(['message']);
    expect(selectedKeywordFieldCandidates).toEqual(['myIpFieldName', 'myKeywordFieldName']);
    expect(selectedTextFieldCandidates).toEqual(['message']);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
  });

  it('returns field candidates for pgBench mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsPgBenchMock);

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
    } as unknown as ElasticsearchClient;

    const {
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = await fetchFieldCandidates({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual([
      '_metadata.elastic_apm_trace_id',
      '_metadata.elastic_apm_transaction_id',
      '_metadata.message_template',
      '_metadata.metadata_event_dataset',
      '_metadata.user_id',
      'agent.ephemeral_id',
      'agent.hostname',
      'agent.id',
      'agent.name',
      'agent.type',
      'agent.version',
      'client.geo.city_name',
      'client.geo.continent_name',
      'client.geo.country_iso_code',
      'client.geo.country_name',
      'client.geo.region_iso_code',
      'client.geo.region_name',
      'client.ip',
      'cloud.account.id',
      'cloud.availability_zone',
      'cloud.instance.id',
      'cloud.instance.name',
      'cloud.machine.type',
      'cloud.project.id',
      'cloud.provider',
      'cloud.service.name',
      'container.id',
      'container.image.name',
      'container.labels.annotation_io_kubernetes_container_hash',
      'container.labels.annotation_io_kubernetes_container_restartCount',
      'container.labels.annotation_io_kubernetes_container_terminationMessagePath',
      'container.labels.annotation_io_kubernetes_container_terminationMessagePolicy',
      'container.labels.annotation_io_kubernetes_pod_terminationGracePeriod',
      'container.labels.io_kubernetes_container_logpath',
      'container.labels.io_kubernetes_container_name',
      'container.labels.io_kubernetes_docker_type',
      'container.labels.io_kubernetes_pod_name',
      'container.labels.io_kubernetes_pod_namespace',
      'container.labels.io_kubernetes_pod_uid',
      'container.labels.io_kubernetes_sandbox_id',
      'container.name',
      'container.runtime',
      'data_stream.dataset',
      'data_stream.namespace',
      'data_stream.type',
      'details',
      'ecs.version',
      'elasticapm_labels.span.id',
      'elasticapm_labels.trace.id',
      'elasticapm_labels.transaction.id',
      'elasticapm_span_id',
      'elasticapm_trace_id',
      'elasticapm_transaction_id',
      'event.category',
      'event.dataset',
      'event.kind',
      'event.module',
      'event.timezone',
      'event.type',
      'fileset.name',
      'host.architecture',
      'host.containerized',
      'host.hostname',
      'host.ip',
      'host.mac',
      'host.name',
      'host.os.codename',
      'host.os.family',
      'host.os.kernel',
      'host.os.name',
      'host.os.platform',
      'host.os.type',
      'host.os.version',
      'hostname',
      'input.type',
      'kubernetes.container.name',
      'kubernetes.labels.app',
      'kubernetes.labels.pod-template-hash',
      'kubernetes.namespace',
      'kubernetes.namespace_labels.kubernetes_io/metadata_name',
      'kubernetes.namespace_uid',
      'kubernetes.node.hostname',
      'kubernetes.node.labels.addon_gke_io/node-local-dns-ds-ready',
      'kubernetes.node.labels.beta_kubernetes_io/arch',
      'kubernetes.node.labels.beta_kubernetes_io/instance-type',
      'kubernetes.node.labels.beta_kubernetes_io/os',
      'kubernetes.node.labels.cloud_google_com/gke-boot-disk',
      'kubernetes.node.labels.cloud_google_com/gke-container-runtime',
      'kubernetes.node.labels.cloud_google_com/gke-nodepool',
      'kubernetes.node.labels.cloud_google_com/gke-os-distribution',
      'kubernetes.node.labels.cloud_google_com/machine-family',
      'kubernetes.node.labels.failure-domain_beta_kubernetes_io/region',
      'kubernetes.node.labels.failure-domain_beta_kubernetes_io/zone',
      'kubernetes.node.labels.kubernetes_io/arch',
      'kubernetes.node.labels.kubernetes_io/hostname',
      'kubernetes.node.labels.kubernetes_io/os',
      'kubernetes.node.labels.node_kubernetes_io/instance-type',
      'kubernetes.node.labels.node_type',
      'kubernetes.node.labels.topology_kubernetes_io/region',
      'kubernetes.node.labels.topology_kubernetes_io/zone',
      'kubernetes.node.name',
      'kubernetes.node.uid',
      'kubernetes.pod.ip',
      'kubernetes.pod.name',
      'kubernetes.pod.uid',
      'kubernetes.replicaset.name',
      'labels.userId',
      'log.file.path',
      'log.flags',
      'log.level',
      'log.logger',
      'log.origin.file.name',
      'log.origin.function',
      'log.original',
      'name',
      'postgresql.log.database',
      'postgresql.log.query',
      'postgresql.log.query_step',
      'postgresql.log.timestamp',
      'process.executable',
      'process.name',
      'process.thread.name',
      'related.user',
      'req.headers.accept',
      'req.headers.accept-encoding',
      'req.headers.cache-control',
      'req.headers.connection',
      'req.headers.content-length',
      'req.headers.content-type',
      'req.headers.cookie',
      'req.headers.host',
      'req.headers.origin',
      'req.headers.pragma',
      'req.headers.referer',
      'req.headers.traceparent',
      'req.headers.tracestate',
      'req.headers.user-agent',
      'req.headers.x-real-ip',
      'req.method',
      'req.remoteAddress',
      'req.url',
      'service.name',
      'service.type',
      'span.id',
      'stack',
      'stream',
      'trace.id',
      'transaction.id',
      'type',
      'user.name',
    ]);
    expect(selectedKeywordFieldCandidates).toEqual([
      'agent.name',
      'agent.type',
      'agent.version',
      'client.geo.city_name',
      'client.geo.continent_name',
      'client.geo.country_name',
      'client.geo.region_name',
      'client.ip',
      'cloud.account.id',
      'cloud.availability_zone',
      'cloud.instance.id',
      'cloud.machine.type',
      'cloud.project.id',
      'cloud.provider',
      'cloud.service.name',
      'container.id',
      'container.image.name',
      'container.name',
      'container.runtime',
      'data_stream.dataset',
      'data_stream.namespace',
      'data_stream.type',
      'ecs.version',
      'event.category',
      'event.dataset',
      'event.kind',
      'event.module',
      'event.timezone',
      'event.type',
      'host.architecture',
      'host.ip',
      'host.name',
      'host.os.family',
      'host.os.kernel',
      'host.os.name',
      'host.os.platform',
      'host.os.version',
      'log.file.path',
      'log.level',
      'log.logger',
      'log.origin.file.name',
      'log.origin.function',
      'process.name',
      'service.name',
      'service.type',
      'user.name',
    ]);
    expect(textFieldCandidates).toEqual(['error.message', 'message']);
    expect(selectedTextFieldCandidates).toEqual(['error.message', 'message']);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
  });

  it('returns field candidates for ecommerce mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsEcommerceMock);

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
    } as unknown as ElasticsearchClient;

    const {
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = await fetchFieldCandidates({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    const expectedKeywordFieldCandidates = [
      'category.keyword',
      'currency',
      'customer_first_name.keyword',
      'customer_full_name.keyword',
      'customer_gender',
      'customer_id',
      'customer_last_name.keyword',
      'customer_phone',
      'day_of_week',
      'email',
      'event.dataset',
      'geoip.city_name',
      'geoip.continent_name',
      'geoip.country_iso_code',
      'geoip.region_name',
      'manufacturer.keyword',
      'order_id',
      'products._id.keyword',
      'products.category.keyword',
      'products.manufacturer.keyword',
      'products.product_name.keyword',
      'products.sku',
      'sku',
      'type',
      'user',
    ];

    expect(keywordFieldCandidates).toEqual(expectedKeywordFieldCandidates);
    expect(textFieldCandidates).toEqual([]);
    expect(selectedKeywordFieldCandidates).toEqual(expectedKeywordFieldCandidates);
    expect(selectedTextFieldCandidates).toEqual([]);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
  });

  it('returns field candidates and total hits for large-arrays mappings', async () => {
    const esClientFieldCapsMock = jest.fn(() => fieldCapsLargeArraysMock);

    const esClientMock = {
      fieldCaps: esClientFieldCapsMock,
    } as unknown as ElasticsearchClient;

    const {
      keywordFieldCandidates,
      textFieldCandidates,
      selectedKeywordFieldCandidates,
      selectedTextFieldCandidates,
    } = await fetchFieldCandidates({
      esClient: esClientMock,
      arguments: { ...paramsSearchQueryMock, textFieldCandidatesOverrides: [] },
    });

    expect(keywordFieldCandidates).toEqual(['items']);
    expect(textFieldCandidates).toEqual([]);
    expect(selectedKeywordFieldCandidates).toEqual(['items']);
    expect(selectedTextFieldCandidates).toEqual([]);
    expect(esClientFieldCapsMock).toHaveBeenCalledTimes(1);
  });
});
