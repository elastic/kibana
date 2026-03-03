/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GCS_BUCKET,
  OTEL_DEMO_GCS_BASE_PATH_PREFIX,
  OTEL_DEMO_NAMESPACE,
} from '../../../scripts/significant_events_snapshots/lib/constants';
import type { DatasetConfig } from './types';

// TODO: Only `healthy-baseline` and `payment-unreachable` have validated criteria and GCS snapshots.
// The remaining scenarios are unvalidated placeholders — snapshots and criteria will be added as
// each scenario is validated.
export const otelDemoDataset: DatasetConfig = {
  id: OTEL_DEMO_NAMESPACE,
  description: 'OpenTelemetry Demo microservices application',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX },
  featureExtraction: [
    {
      input: {
        scenario_id: 'healthy-baseline',
      },
      output: {
        criteria: [
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: resource.attributes.app=frontend OR resource.attributes.app.kubernetes.io/name=frontend OR resource.attributes.k8s.deployment.name=frontend)',
            score: 1,
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity (evidence: resource.attributes.app=checkout)',
            score: 2,
          },
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity (evidence: resource.attributes.app=cart; cartservice logs)',
            score: 2,
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: resource.attributes.app=payment; paymentservice container metadata)',
            score: 1,
          },
          {
            id: 'entity-product-catalog',
            text: 'Must identify product-catalog service as an entity (evidence: resource.attributes.app=product-catalog OR resource.attributes.app.kubernetes.io/name=product-catalog OR resource.attributes.k8s.deployment.name=product-catalog)',
            score: 1,
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: resource.attributes.app=shipping)',
            score: 1,
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: resource.attributes.app=email)',
            score: 1,
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: resource.attributes.app=ad)',
            score: 1,
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: resource.attributes.app=recommendation)',
            score: 1,
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: resource.attributes.app=quote)',
            score: 1,
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout -> payment (evidence: checkout logs mention payment and transaction/charge success)',
            score: 2,
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (k8s pod/container metadata present)',
            score: 1,
          },
        ],
        min_features: 4,
        max_features: 30,
        required_types: ['entity'],
        expected_ground_truth:
          'entities=[frontend, checkout, cart, payment, product-catalog, recommendation, shipping, email, ad, quote], deps=[checkout->payment, cart->valkey], infra=[kubernetes]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
        failure_mode: 'healthy_baseline',
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
        log_query_filter: {
          bool: {
            filter: [
              { terms: { 'resource.attributes.app': ['frontend', 'checkout'] } },
              {
                bool: {
                  should: [
                    { match_phrase: { 'body.text': 'failed to charge card' } },
                    { match_phrase: { 'body.text': 'transport: Error while dialing' } },
                    { match_phrase: { 'body.text': 'dial tcp' } },
                    { match_phrase: { 'body.text': 'i/o timeout' } },
                    { match_phrase: { 'body.text': 'deadline exceeded' } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
      },
      output: {
        criteria: [
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity (evidence: resource.attributes.app=checkout)',
            score: 2,
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity and downstream target (evidence: resource.attributes.app=payment and/or paymentservice container metadata)',
            score: 2,
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout -> payment (evidence: charge failures/dialing/timeouts toward payment, often surfaced in frontend/checkout logs)',
            score: 3,
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service (evidence: resource.attributes.app=frontend; upstream impact)',
            score: 1,
          },
          {
            id: 'error-signatures',
            text: 'Must reference error signatures like i/o timeout, dial tcp, deadline exceeded, or gRPC errors in evidence',
            score: 2,
          },
        ],
        min_features: 3,
        max_features: 30,
        required_types: ['entity', 'dependency'],
        expected_ground_truth:
          'entities=[checkout, payment, frontend], deps=[checkout->payment (timeout)], error_signatures=[i/o timeout, dial tcp, deadline exceeded, gRPC transport failure]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'cart-redis-cutoff',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity (failing service)',
            score: 2,
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency from cart to Valkey/Redis (dead endpoint)',
            score: 3,
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service (affected by cart failures)',
            score: 1,
          },
          {
            id: 'tech-redis',
            text: 'Must identify Valkey or Redis as technology or dependency',
            score: 2,
          },
          {
            id: 'error-signatures',
            text: 'Must reference connection errors to Valkey/Redis (connection refused, ECONNREFUSED, timeout)',
            score: 2,
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity', 'dependency'],
        expected_ground_truth:
          'entities=[cart, checkout, frontend], deps=[cart->valkey (connection refused)], tech=[valkey/redis], error_signatures=[ECONNREFUSED, connection timeout]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'currency-unreachable',
      },
      output: {
        criteria: [
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service (cannot reach currency)',
            score: 2,
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service (cannot reach currency)',
            score: 2,
          },
          {
            id: 'entity-currency',
            text: 'Must identify currency service as an entity (unreachable target)',
            score: 2,
          },
          {
            id: 'dep-checkout-currency',
            text: 'Must identify the dependency from checkout to currency service',
            score: 3,
          },
          {
            id: 'dep-frontend-currency',
            text: 'Must identify the dependency from frontend to currency service',
            score: 2,
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity', 'dependency'],
        expected_ground_truth:
          'entities=[checkout, frontend, currency], deps=[checkout->currency, frontend->currency], error_signatures=[connection refused, deadline exceeded]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'currency',
        failure_mode: 'currency_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
      },
      output: {
        criteria: [
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity (resource-starved)',
            score: 2,
          },
          {
            id: 'resource-exhaustion',
            text: 'Must identify memory pressure, GC thrashing, or resource exhaustion signals',
            score: 3,
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend (upstream, seeing timeouts from checkout)',
            score: 1,
          },
          {
            id: 'infra-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (OOMKilled, container restarts)',
            score: 2,
          },
          {
            id: 'dep-upstream',
            text: 'Must identify dependency impact on services calling checkout',
            score: 2,
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity'],
        expected_ground_truth:
          'entities=[checkout, frontend], infra=[kubernetes, memory/GC], error_signatures=[timeout, OOMKilled, GC pressure, 500 errors]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
        failure_mode: 'memory_starvation',
      },
    },
    {
      input: {
        scenario_id: 'flagd-unreachable',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service (cannot reach flagd)',
            score: 2,
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service (cannot reach flagd)',
            score: 2,
          },
          {
            id: 'dep-services-flagd',
            text: 'Must identify the dependency from multiple services to flagd (feature flag service)',
            score: 3,
          },
          {
            id: 'tech-flagd',
            text: 'Must identify flagd or feature flags as technology/dependency',
            score: 2,
          },
          {
            id: 'error-signatures',
            text: 'Must reference flag evaluation failures or connection errors to flagd',
            score: 1,
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity', 'dependency'],
        expected_ground_truth:
          'entities=[cart, payment, recommendation], deps=[cart->flagd, payment->flagd, recommendation->flagd], tech=[flagd/feature-flags], error_signatures=[flag evaluation failed, connection refused]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'flagd',
        failure_mode: 'feature_flags_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'load-generator-ramp',
      },
      output: {
        criteria: [
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service (under high load)',
            score: 2,
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service (under pressure)',
            score: 1,
          },
          {
            id: 'latency-signals',
            text: 'Must identify latency increase or elevated error rates across services',
            score: 2,
          },
          {
            id: 'multiple-services',
            text: 'Must identify impact across multiple services (demand surge affects the whole system)',
            score: 2,
          },
        ],
        min_features: 3,
        max_features: 20,
        required_types: ['entity'],
        expected_ground_truth:
          'entities=[frontend, checkout, cart, ...multiple services], signals=[elevated latency, increased error rates, 500 errors under load]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'system-wide',
        failure_mode: 'demand_surge',
      },
    },
  ],
  queryGeneration: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        stream_name: 'logs',
        stream_description:
          'OTel Demo application logs under healthy conditions with normal traffic across all microservices',
      },
      output: {
        criteria: [
          {
            id: 'healthy-baseline-queries',
            text: 'Should generate queries for operational monitoring (e.g., service health, throughput, request volume, latency) rather than error-focused detection since this is healthy traffic',
            score: 2,
          },
          {
            id: 'multi-service-coverage',
            text: 'Generated queries should cover multiple services present in the logs (e.g., cart, checkout, shipping, payment) rather than a single service only',
            score: 2,
          },
        ],
        expected_categories: ['operational'],
        expected_ground_truth:
          'queries=[operational monitoring for service health/traffic/latency across cart/checkout/shipping/payment services]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
        failure_mode: 'healthy_baseline',
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the payment service becomes unreachable, causing charge failures with dial tcp / i/o timeout / deadline exceeded and gRPC transport dialing errors',
      },
      output: {
        criteria: [
          {
            id: 'payment-error-query',
            text: 'Must generate a KQL query that catches payment-unreachable errors (e.g., failed to charge card, transport: Error while dialing, dial tcp, i/o timeout, deadline exceeded)',
            score: 3,
          },
          {
            id: 'checkout-impact-query',
            text: 'Should generate a query that detects user-facing impact in upstream services (frontend and/or checkout) caused by payment unreachability',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax that can be parsed without errors',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        kql_substrings: ['failed to charge card', 'dial tcp', 'i/o timeout', 'deadline exceeded'],
        expected_ground_truth:
          'queries=[error detection for dial tcp/i/o timeout/deadline exceeded gRPC dialing errors for payment unreachability, upstream impact in frontend/checkout]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'checkout',
        failure_mode: 'payment_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'cart-redis-cutoff',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the cart service loses connectivity to its Valkey/Redis backing store, causing cart operations to fail',
      },
      output: {
        criteria: [
          {
            id: 'cache-error-query',
            text: 'Must generate a KQL query that catches Valkey/Redis connection failures (ECONNREFUSED, connection timeout)',
            score: 3,
          },
          {
            id: 'cart-error-query',
            text: 'Should generate a query detecting cart service errors',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        kql_substrings: ['cart'],
        expected_ground_truth:
          'queries=[error detection for Valkey/Redis connection failures from cart, cart service errors]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'currency-unreachable',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the currency service is unreachable, impacting both checkout and frontend services that depend on currency conversion',
      },
      output: {
        criteria: [
          {
            id: 'currency-error-query',
            text: 'Must generate a KQL query that catches currency service connection errors',
            score: 3,
          },
          {
            id: 'multi-consumer-impact',
            text: 'Should generate queries reflecting impact on both checkout and frontend services',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        expected_ground_truth:
          'queries=[error detection for currency service connectivity from checkout and frontend, currency connection refused errors]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'currency',
        failure_mode: 'currency_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the checkout service is memory-starved, causing OOMKilled restarts, GC pressure, and cascading timeouts',
      },
      output: {
        criteria: [
          {
            id: 'resource-exhaustion-query',
            text: 'Must generate a KQL query that catches resource exhaustion signals (OOMKilled, memory, GC pressure, container restart)',
            score: 3,
          },
          {
            id: 'checkout-timeout-query',
            text: 'Should generate a query detecting checkout timeouts or 500 errors',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax',
            score: 2,
          },
        ],
        expected_categories: ['error', 'resource_health'],
        expected_ground_truth:
          'queries=[resource health for OOMKilled/memory exhaustion in checkout, error detection for checkout timeouts/500s]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
        failure_mode: 'memory_starvation',
      },
    },
    {
      input: {
        scenario_id: 'flagd-unreachable',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs where the flagd feature flag service is unreachable, causing flag evaluation failures across multiple services (cart, payment, recommendation)',
      },
      output: {
        criteria: [
          {
            id: 'flag-evaluation-query',
            text: 'Must generate a KQL query that catches flag evaluation failures or flagd connection errors',
            score: 3,
          },
          {
            id: 'cross-service-impact',
            text: 'Should capture the cross-service nature of the flagd failure (multiple services affected)',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax',
            score: 2,
          },
        ],
        expected_categories: ['error', 'configuration'],
        expected_ground_truth:
          'queries=[error detection for flagd/feature-flag evaluation failures, connection errors to flagd across cart/payment/recommendation]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'flagd',
        failure_mode: 'feature_flags_unreachable',
      },
    },
    {
      input: {
        scenario_id: 'load-generator-ramp',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs under ramped-up load where the load generator is sending significantly more traffic, causing latency increases and error rates across the entire system',
      },
      output: {
        criteria: [
          {
            id: 'latency-spike-query',
            text: 'Must generate KQL queries that catch elevated latency or increased error rates',
            score: 2,
          },
          {
            id: 'system-wide-impact',
            text: 'Should generate queries covering the system-wide nature of the demand surge (not just one service)',
            score: 2,
          },
          {
            id: 'valid-kql-syntax',
            text: 'All generated queries must have valid KQL syntax',
            score: 2,
          },
        ],
        expected_categories: ['operational', 'error'],
        expected_ground_truth:
          'queries=[operational detection for elevated latency/error rates under load surge across frontend/checkout/cart services]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'system-wide',
        failure_mode: 'demand_surge',
      },
    },
  ],
};
