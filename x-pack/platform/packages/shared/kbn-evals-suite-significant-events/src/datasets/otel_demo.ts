/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GCS_BUCKET, OTEL_DEMO_GCS_BASE_PATH_PREFIX, OTEL_DEMO_NAMESPACE } from '../constants';
import type { DatasetConfig } from './types';

export const otelDemoDataset: DatasetConfig = {
  id: OTEL_DEMO_NAMESPACE,
  description: 'OpenTelemetry Demo microservices application',
  gcs: { bucket: GCS_BUCKET, basePathPrefix: OTEL_DEMO_GCS_BASE_PATH_PREFIX },
  kiFeatureExtraction: [
    {
      input: {
        scenario_id: 'healthy-baseline',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 697 docs; ValkeyCartStore operations — GetCartAsync, AddItemAsync, EmptyCartAsync — in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 223 docs; "payment went through (transaction_id: ...)" and "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 223 docs; "Sending Quote" and "Received quote" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 157 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 154 docs; attributes.msg contains "Charge request received" and "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 135 docs; "Receive ListRecommendations for product ids" from recommendation_server.py in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 131 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 74 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: resource.attributes.app=frontend; only 3 docs with startup messages)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'frontend' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 10 docs with background saving/RDB operations; cart service logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout → payment (evidence: 74 checkout docs log "payment went through (transaction_id: ...)" correlating with payment "Charge request received" / "Transaction complete")',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'checkout' } },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync; valkey runs its own container with valkey/valkey:8-alpine image)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" at same timestamps as email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo, deployment/pod/container metadata on all docs)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, shipping, email, payment, recommendation, ad, quote, frontend, valkey], deps=[checkout->payment, cart->valkey, checkout->email, shipping->quote], infra=[kubernetes/minikube, otel-demo namespace, otel-collector for log aggregation, arm64 architecture]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
      },
    },
    {
      input: {
        scenario_id: 'payment-unreachable',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 1281 docs; ValkeyCartStore operations — GetCartAsync, AddItemAsync — in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 280 docs; "[PlaceOrder] user_id=..." and "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: 315 docs; gRPC errors including "Error: 13 INTERNAL: failed to charge card" and "Error: 14 UNAVAILABLE: No connection established" with Node.js stack traces)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'failed to charge card' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 372 docs; "Sending Quote", "Received quote", "Tracking ID Created" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 127 docs; attributes.msg="Charge request received" / "Transaction complete"; partially reachable during this scenario)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 130 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 223 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 250 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 156 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 15 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Must identify the dependency checkout → payment (evidence: checkout PlaceOrder triggers payment; frontend shows "failed to charge card: could not charge the card: rpc error: code = Unavailable ... dial tcp 10.98.122.240:9999: i/o timeout")',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'checkout' } },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'error-payment-unreachable',
            text: 'Must reference payment unreachability errors in at least one feature: gRPC code 13 INTERNAL / code 14 UNAVAILABLE, "failed to charge card", "transport: Error while dialing: dial tcp", "i/o timeout", or "connection refused"',
            score: 3,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'failed to charge card' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, frontend, shipping, payment, email, recommendation, ad, quote, valkey], deps=[checkout->payment, cart->valkey, checkout->email, shipping->quote, frontend->checkout], infra=[kubernetes/minikube], error_signatures=[failed to charge card, dial tcp i/o timeout, gRPC code 13 INTERNAL / code 14 UNAVAILABLE, transport: Error while dialing, connection refused; errors observed in checkout and frontend service logs]',
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
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 587 docs; ValkeyCartStore operations in body.text; "Application is shutting down" indicating cart crash after Valkey loss)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'cart' } },
                    { match_phrase: { 'body.text': 'connect to redis' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-frontend',
            text: 'Must identify frontend service as an entity (evidence: 1481 docs; gRPC errors "Error: 14 UNAVAILABLE: No connection established. Last error: connect ECONNREFUSED 10.105.181.182:7070" with getCart/addItem call traces)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'ECONNREFUSED' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity (evidence: 293 docs; "[PlaceOrder]" and "order confirmation email sent to")',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 203 docs; "Sending Quote", "Tracking ID Created" patterns in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 141 docs; attributes.msg="Charge request received" / "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 144 docs; POST /send_order_confirmation HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 232 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 239 docs; "oteldemo.AdService - Targeted ad request received" in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 68 docs; POST /getquote HTTP/1.1 200 in body.text)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 10 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync; cart crashed "Application is shutting down" after losing Valkey connection)',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-frontend-cart',
            text: 'Must identify the dependency frontend → cart (evidence: 283 frontend gRPC errors "ECONNREFUSED 10.105.181.182:7070" with getCart/addItem call traces showing cart service unreachable)',
            score: 3,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'frontend' } },
              { term: { 'resource.attributes.app': 'cart' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'error-cart-unreachable',
            text: 'Must reference cart unreachability errors in at least one feature: gRPC code 14 UNAVAILABLE, ECONNREFUSED, "No connection established", "Application is shutting down", or "failed to get user cart during checkout"',
            score: 3,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'frontend' } },
                    { match_phrase: { 'body.text': 'ECONNREFUSED' } },
                  ],
                },
              },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, frontend, checkout, shipping, payment, email, recommendation, ad, quote, valkey], deps=[cart->valkey, frontend->cart, checkout->email, shipping->quote, frontend->checkout], infra=[kubernetes/minikube, otel-demo namespace, otel-collector, arm64 architecture], error_signatures=[ECONNREFUSED 10.105.181.182:7070 cart unreachable, gRPC code 14 UNAVAILABLE, No connection established, Application is shutting down (cart crash), cart failure: failed to get user cart during checkout; frontend observes cart errors via gRPC]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
      },
      output: {
        criteria: [
          {
            id: 'entity-cart',
            text: 'Must identify cart service as an entity with filter on resource.attributes.app=cart (evidence: 1331 docs, highest volume; ValkeyCartStore GetCartAsync/AddItemAsync/EmptyCartAsync operations)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'cart' } }],
          },
          {
            id: 'entity-checkout',
            text: 'Must identify checkout service as an entity with filter on resource.attributes.app=checkout (evidence: 436 docs; "[PlaceOrder]", "payment went through", "order confirmation email sent to" in body.text)',
            score: 2,
            sampling_filters: [{ term: { 'resource.attributes.app': 'checkout' } }],
          },
          {
            id: 'entity-shipping',
            text: 'Must identify shipping service as an entity (evidence: 434 docs; "Sending Quote", "Received quote", "Tracking ID Created" patterns)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'shipping' } }],
          },
          {
            id: 'entity-email',
            text: 'Must identify email service as an entity (evidence: 298 docs; POST /send_order_confirmation HTTP/1.1 200)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'email' } }],
          },
          {
            id: 'entity-payment',
            text: 'Must identify payment service as an entity (evidence: 295 docs; attributes.msg="Charge request received" / "Transaction complete")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'payment' } }],
          },
          {
            id: 'entity-ad',
            text: 'Must identify ad service as an entity (evidence: 244 docs; "oteldemo.AdService - Targeted ad request received")',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'ad' } }],
          },
          {
            id: 'entity-recommendation',
            text: 'Must identify recommendation service as an entity (evidence: 204 docs; "Receive ListRecommendations for product ids" from recommendation_server.py)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'recommendation' } }],
          },
          {
            id: 'entity-quote',
            text: 'Must identify quote service as an entity (evidence: 145 docs; POST /getquote HTTP/1.1 200)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'quote' } }],
          },
          {
            id: 'entity-valkey',
            text: 'Must identify valkey as a cache/data store entity (evidence: 15 docs; cart logs reference ValkeyCartStore; container image valkey/valkey:8-alpine)',
            score: 1,
            sampling_filters: [{ term: { 'resource.attributes.app': 'valkey' } }],
          },
          {
            id: 'dep-cart-valkey',
            text: 'Must identify the dependency cart → valkey (evidence: cart logs reference cartservice.cartstore.ValkeyCartStore for GetCartAsync/AddItemAsync/EmptyCartAsync)',
            score: 2,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'cart' } },
              { term: { 'resource.attributes.app': 'valkey' } },
            ],
          },
          {
            id: 'dep-checkout-payment',
            text: 'Should identify the dependency checkout → payment (evidence: checkout logs "payment went through (transaction_id: ...)")',
            score: 1,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'checkout' } },
              { term: { 'resource.attributes.app': 'payment' } },
            ],
          },
          {
            id: 'dep-checkout-email',
            text: 'Should identify the dependency checkout → email (evidence: checkout logs "order confirmation email sent to" correlating with email POST /send_order_confirmation 200)',
            score: 1,
            sampling_filters: [
              {
                bool: {
                  filter: [
                    { term: { 'resource.attributes.app': 'checkout' } },
                    { match_phrase: { 'body.text': 'order confirmation email sent to' } },
                  ],
                },
              },
              { term: { 'resource.attributes.app': 'email' } },
            ],
          },
          {
            id: 'dep-shipping-quote',
            text: 'Should identify the dependency shipping → quote (evidence: shipping "Received quote" correlating with quote POST /getquote)',
            score: 1,
            sampling_filters: [
              { term: { 'resource.attributes.app': 'shipping' } },
              { term: { 'resource.attributes.app': 'quote' } },
            ],
          },
          {
            id: 'k8s-pod-events',
            text: 'Should identify Kubernetes pod lifecycle events showing checkout rolling update (evidence: 15 checkout-specific K8s events; reason=Killing "Stopping container checkout" for old pod checkout-78684c5ffd-cbbfc, then new replica set checkout-5766978597 scaled up with full pod lifecycle: Scheduled → Created → Pulled → Started)',
            score: 1,
            sampling_filters: [
              { match: { 'body.structured.object.reason': 'Killing' } },
              { match: { 'body.structured.object.reason': 'ScalingReplicaSet' } },
              { match: { 'body.structured.object.reason': 'Started' } },
            ],
          },
          {
            id: 'tech-kubernetes',
            text: 'Must identify Kubernetes as infrastructure (evidence: resource.attributes.k8s.node.name=minikube, resource.attributes.k8s.namespace.name=otel-demo)',
            score: 1,
          },
        ],
        min_features: 8,
        max_features: 25,
        required_types: ['entity', 'dependency'],
        expect_entity_filters: true,
        expected_ground_truth:
          'entities=[cart, checkout, shipping, email, payment, ad, recommendation, quote, valkey], deps=[cart->valkey, checkout->payment, checkout->email, checkout->shipping, shipping->quote], infra=[kubernetes/minikube, otel-demo namespace, otel-collector, arm64 architecture], k8s_events=[checkout rolling update: old pod checkout-78684c5ffd-cbbfc killed (reason=Killing), new replica set checkout-5766978597 created; 60 total K8s events across all services]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
        failure_mode: 'memory_starvation',
      },
    },
  ],
  kiFeatureDuplication: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        runs: 5,
      },
    },
  ],
  kiFeatureExclusion: [
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 4,
        follow_up_runs: 3,
      },
    },
    {
      input: {
        scenario_id: 'healthy-baseline',
        sample_document_count: 20,
        exclude_count: 1,
        follow_up_runs: 3,
      },
    },
  ],
  kiQueryGeneration: [
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
            id: 'operational-monitoring',
            text: 'Should generate queries for operational monitoring (e.g., service health, HTTP request patterns, request volume) across the multi-service environment',
            score: 2,
          },
          {
            id: 'error-monitoring',
            text: 'Should generate proactive error detection queries (e.g., generic error/exception patterns, connection failures, dependency errors) even though this is healthy traffic — the model should set up error monitoring based on entity and dependency features',
            score: 2,
          },
          {
            id: 'multi-service-coverage',
            text: 'Generated queries should cover multiple services present in the logs (e.g., cart, checkout, shipping, payment, frontend) using entity scoping via resource.attributes.app when appropriate',
            score: 2,
          },
          {
            id: 'feature-grounded',
            text: 'Queries must be grounded in features from the input (entities, dependencies, dataset_analysis, error_logs) rather than being speculative or based solely on the stream name/description',
            score: 2,
          },
        ],
        expected_categories: ['operational', 'error'],
        expected_ground_truth:
          'queries=[operational monitoring and proactive error detection across OTel Demo microservices (cart, checkout, shipping, payment, frontend, email, recommendation, ad, quote, valkey); operational queries for service health and request patterns; error queries for exception/failure detection grounded in entity and dependency features]',
      },
      metadata: {
        difficulty: 'easy',
        failure_domain: 'none',
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
            text: 'Must generate an ES|QL query that catches payment-unreachable errors (evidence: checkout logs contain "failed to charge card", "transport: Error while dialing: dial tcp", "i/o timeout", "context deadline exceeded")',
            score: 3,
          },
          {
            id: 'checkout-impact-query',
            text: 'Should generate a query that detects user-facing impact in checkout or frontend caused by payment unreachability (evidence: checkout logs show gRPC INTERNAL/UNAVAILABLE errors when calling payment)',
            score: 2,
          },
          {
            id: 'grpc-transport-query',
            text: 'Should generate a query targeting gRPC transport or connection errors (evidence: "transport: Error while dialing", gRPC code 13 INTERNAL / code 14 UNAVAILABLE in checkout and frontend logs)',
            score: 1,
          },
        ],
        expected_categories: ['error', 'operational'],
        esql_substrings: ['charge', 'dial', 'timeout'],
        expected_ground_truth:
          'queries=[error detection for payment charge failures (failed to charge card), gRPC transport/dialing errors (dial tcp, i/o timeout, deadline exceeded), upstream impact detection in checkout/frontend services, operational monitoring across OTel Demo microservices]',
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
            text: 'Must generate an ES|QL query that catches Valkey/Redis connection failures (evidence: cart logs contain "ECONNREFUSED 10.105.181.182:7070", "No connection established" referencing valkey)',
            score: 3,
          },
          {
            id: 'cart-service-error-query',
            text: 'Should generate a query detecting cart service errors or crash signals (evidence: cart logs show "Application is shutting down", cart crash causes gRPC UNAVAILABLE errors)',
            score: 2,
          },
          {
            id: 'upstream-impact-query',
            text: 'Should generate a query detecting upstream impact in checkout or frontend caused by cart unavailability (evidence: checkout logs "failed to get user cart", frontend sees gRPC code 14 UNAVAILABLE from cart)',
            score: 2,
          },
        ],
        expected_categories: ['error', 'operational'],
        esql_substrings: ['cart', 'ECONNREFUSED'],
        expected_ground_truth:
          'queries=[error detection for Valkey/Redis ECONNREFUSED connection failures in cart, cart service crash/shutdown detection, upstream impact in checkout/frontend from cart unavailability (gRPC UNAVAILABLE, failed to get user cart), operational monitoring across OTel Demo microservices]',
      },
      metadata: {
        difficulty: 'medium',
        failure_domain: 'cart',
        failure_mode: 'redis_cutoff',
      },
    },
    {
      input: {
        scenario_id: 'checkout-memory-starvation',
        stream_name: 'logs',
        stream_description:
          'OTel Demo logs during a checkout service disruption with Kubernetes pod lifecycle events (pod termination and rolling update) across a multi-service microservice environment',
      },
      output: {
        criteria: [
          {
            id: 'multi-service-error-monitoring',
            text: 'Should generate error detection queries targeting multiple services (e.g., checkout, cart, payment) either by scoping with resource.attributes.app or by filtering on service-specific log patterns in body.text',
            score: 3,
          },
          {
            id: 'dependency-aware-queries',
            text: 'Should generate queries that reflect dependency relationships (e.g., checkout→payment, cart→valkey, checkout→email) by monitoring communication paths or downstream failure patterns',
            score: 2,
          },
          {
            id: 'operational-monitoring-query',
            text: 'Should generate operational queries for service health monitoring (e.g., order throughput, transaction completions, email confirmations) grounded in entity features and log patterns observed in the data',
            score: 2,
          },
        ],
        expected_categories: ['operational', 'error'],
        expected_ground_truth:
          'queries=[entity-scoped error detection for checkout, cart, payment, and shipping services; dependency-aware monitoring for checkout→payment, cart→valkey, checkout→email, shipping→quote communication paths; operational monitoring for order throughput (PlaceOrder), payment transactions, and email confirmations across OTel Demo microservices]',
      },
      metadata: {
        difficulty: 'hard',
        failure_domain: 'checkout',
      },
    },
  ],
};
